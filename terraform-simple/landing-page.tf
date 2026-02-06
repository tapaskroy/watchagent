# S3 bucket for landing page static website
resource "aws_s3_bucket" "landing_page" {
  bucket = "tapaskroy-me-landing"
}

resource "aws_s3_bucket_public_access_block" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_policy" "landing_page" {
  bucket = aws_s3_bucket.landing_page.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.landing_page.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.landing_page]
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "landing_page" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation record for ACM certificate
resource "aws_route53_record" "landing_page_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.landing_page.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "landing_page" {
  certificate_arn         = aws_acm_certificate.landing_page.arn
  validation_record_fqdns = [for record in aws_route53_record.landing_page_cert_validation : record.fqdn]
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "landing_page" {
  comment = "OAI for tapaskroy.me landing page"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "landing_page" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket_website_configuration.landing_page.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.landing_page.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.landing_page.id}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.landing_page.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [aws_acm_certificate_validation.landing_page]
}

# Route53 A record for root domain pointing to CloudFront
resource "aws_route53_record" "landing_page" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.landing_page.domain_name
    zone_id                = aws_cloudfront_distribution.landing_page.hosted_zone_id
    evaluate_target_health = false
  }
}
