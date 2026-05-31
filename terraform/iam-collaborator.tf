# Collaborator IAM access for building infrastructure (staging, etc.)
#
# Model: a dedicated IAM user with PowerUserAccess (everything except IAM/Org)
# PLUS a scoped IAM-management policy so Terraform can create the project's
# roles — all capped by a permissions boundary that prevents privilege
# escalation.
#
# IMPORTANT — credentials are intentionally NOT created here:
#   Terraform creating an access key or login profile would persist the secret
#   in state. After `terraform apply`, mint them out-of-band so the secret is
#   shown once and never stored:
#     aws iam create-login-profile --user-name akanksha \
#       --password '<temp>' --password-reset-required
#     aws iam create-access-key --user-name akanksha
#   Then have her enable MFA on first console login.
#
# `data.aws_caller_identity.current` is defined in codebuild.tf.

locals {
  collaborator_name = "akanksha"
  # Roles/policies Terraform manages all share the project prefix.
  managed_iam_arn_prefix = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-*"
  managed_policy_arn     = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project_name}-collaborator-boundary"
  # The delegation (IAM-management) policy must be protected from self-edit too,
  # otherwise she could version it to grant herself an unconditional CreateRole.
  managed_delegation_policy_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project_name}-collaborator-iam-management"
}

# ---------------------------------------------------------------------------
# Permissions boundary — the ceiling for the user AND for every role she
# creates (her IAM-management policy below forces this boundary onto new
# roles, so she cannot mint a role more powerful than this).
# ---------------------------------------------------------------------------
resource "aws_iam_policy" "collaborator_boundary" {
  name        = "${var.project_name}-collaborator-boundary"
  description = "Permissions boundary for WatchAgent collaborators (escalation guard)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowAllAsCeiling"
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      },
      {
        Sid    = "DenyEscalationAndAccountControl"
        Effect = "Deny"
        Action = [
          # No new principals / no minting creds for others
          "iam:CreateUser",
          "iam:CreateAccessKey",
          "iam:CreateLoginProfile",
          "iam:UpdateLoginProfile",
          # No tampering with permissions boundaries (incl. her own)
          "iam:PutUserPermissionsBoundary",
          "iam:DeleteUserPermissionsBoundary",
          "iam:DeleteRolePermissionsBoundary",
          # No org / account / billing
          "organizations:*",
          "account:*",
          "aws-portal:*",
          "billing:*",
          "ce:*"
        ]
        Resource = "*"
      },
      {
        # Protect BOTH governing policies: the boundary itself AND the
        # delegation policy. If she could version the delegation policy she
        # could grant herself an unconditional iam:CreateRole and escape the
        # cap below.
        Sid    = "DenyEditingGoverningPolicies"
        Effect = "Deny"
        Action = [
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "iam:SetDefaultPolicyVersion",
          "iam:DeletePolicy"
        ]
        # Construct the ARNs by name (not resource refs) to avoid a self-cycle.
        Resource = [
          local.managed_policy_arn,
          local.managed_delegation_policy_arn
        ]
      },
      {
        # Boundary-side backstop: every role she creates MUST carry this
        # boundary. The matching Allow condition lives in the delegation
        # policy, but that policy is identity-side and could be rewritten;
        # enforcing it here too means a created role can never escape the cap.
        Sid    = "DenyCreateRoleWithoutBoundary"
        Effect = "Deny"
        Action = [
          "iam:CreateRole",
          "iam:PutRolePermissionsBoundary"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "iam:PermissionsBoundary" = local.managed_policy_arn
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-collaborator-boundary"
  }
}

# ---------------------------------------------------------------------------
# Scoped IAM-management policy — lets Terraform create/manage the project's
# roles and policies (ECS task roles, CodeBuild role, etc.), but only under
# the project name prefix and only with the boundary attached.
# ---------------------------------------------------------------------------
resource "aws_iam_policy" "collaborator_iam_management" {
  name        = "${var.project_name}-collaborator-iam-management"
  description = "Scoped IAM role/policy management for WatchAgent infra (Terraform)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadIam"
        Effect = "Allow"
        Action = [
          "iam:Get*",
          "iam:List*"
        ]
        Resource = "*"
      },
      {
        Sid    = "ManageProjectRoles"
        Effect = "Allow"
        Action = [
          "iam:DeleteRole",
          "iam:UpdateRole",
          "iam:UpdateRoleDescription",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:UpdateAssumeRolePolicy"
        ]
        Resource = local.managed_iam_arn_prefix
      },
      {
        # CreateRole and setting a role's boundary are gated: the boundary
        # MUST be our boundary policy, so she can't create an unbounded role.
        Sid    = "CreateProjectRolesWithBoundary"
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:PutRolePermissionsBoundary"
        ]
        Resource = local.managed_iam_arn_prefix
        Condition = {
          StringEquals = {
            "iam:PermissionsBoundary" = local.managed_policy_arn
          }
        }
      },
      {
        Sid      = "PassProjectRoles"
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = local.managed_iam_arn_prefix
      },
      {
        Sid    = "ManageProjectCustomerPolicies"
        Effect = "Allow"
        Action = [
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "iam:SetDefaultPolicyVersion",
          "iam:TagPolicy",
          "iam:UntagPolicy"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project_name}-*"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-collaborator-iam-management"
  }
}

# ---------------------------------------------------------------------------
# The collaborator user.
# ---------------------------------------------------------------------------
resource "aws_iam_user" "collaborator" {
  name                 = local.collaborator_name
  permissions_boundary = aws_iam_policy.collaborator_boundary.arn

  tags = {
    Name = local.collaborator_name
    Role = "infrastructure-collaborator"
  }
}

resource "aws_iam_user_policy_attachment" "collaborator_poweruser" {
  user       = aws_iam_user.collaborator.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_user_policy_attachment" "collaborator_iam_management" {
  user       = aws_iam_user.collaborator.name
  policy_arn = aws_iam_policy.collaborator_iam_management.arn
}

output "collaborator_user_name" {
  value       = aws_iam_user.collaborator.name
  description = "IAM user for the infrastructure collaborator (create creds out-of-band; see iam-collaborator.tf)"
}
