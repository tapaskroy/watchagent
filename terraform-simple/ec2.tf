# Security Group for EC2 instance
resource "aws_security_group" "app" {
  name_prefix = "watchagent-app-"
  description = "Security group for WatchAgent application server"
  vpc_id      = aws_vpc.main.id

  # SSH access (restrict to your IP in production)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # TODO: Restrict to your IP
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "watchagent-app-sg"
  }
}

# SSH Key Pair
resource "aws_key_pair" "app" {
  key_name   = var.ssh_key_name
  public_key = var.ssh_public_key != "" ? var.ssh_public_key : file(pathexpand("~/.ssh/id_rsa.pub"))

  tags = {
    Name = "watchagent-key"
  }
}

# IAM Role for EC2 (for CloudWatch logs, etc.)
resource "aws_iam_role" "ec2" {
  name = "watchagent-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "watchagent-ec2-role"
  }
}

# Attach CloudWatch logs policy
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "ec2" {
  name = "watchagent-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = {
    Name = "watchagent-ec2-profile"
  }
}

# User data script to setup Docker and deploy app
locals {
  user_data = templatefile("${path.module}/user-data.sh", {
    tmdb_api_key      = var.tmdb_api_key
    omdb_api_key      = var.omdb_api_key
    anthropic_api_key = var.anthropic_api_key
    domain            = "${var.subdomain}.${var.domain_name}"
    api_domain        = "api.${var.subdomain}.${var.domain_name}"
  })
}

# EC2 Instance
resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.app.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  user_data = local.user_data

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name = "watchagent-app-server"
  }

  lifecycle {
    ignore_changes = [ami] # Don't recreate when new AMI is available
  }
}

# Elastic IP for consistent public IP
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = {
    Name = "watchagent-app-eip"
  }
}
