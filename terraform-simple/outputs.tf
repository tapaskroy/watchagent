output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Elastic IP of the instance"
  value       = aws_eip.app.public_ip
}

output "web_url" {
  description = "URL of the web application"
  value       = "https://${var.subdomain}.${var.domain_name}"
}

output "api_url" {
  description = "URL of the API"
  value       = "https://api.${var.subdomain}.${var.domain_name}"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem ubuntu@${aws_eip.app.public_ip}"
}

output "deploy_command" {
  description = "Command to deploy the application"
  value       = "./scripts/deploy-to-ec2.sh ${aws_eip.app.public_ip}"
}

output "setup_ssl_command" {
  description = "Command to setup SSL certificates (run on the server)"
  value       = "sudo certbot --nginx -d ${var.subdomain}.${var.domain_name} -d api.${var.subdomain}.${var.domain_name} --non-interactive --agree-tos --email your-email@example.com"
}

# Landing page outputs
output "landing_page_s3_bucket" {
  description = "S3 bucket name for landing page"
  value       = aws_s3_bucket.landing_page.id
}

output "landing_page_cloudfront_url" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.landing_page.domain_name
}

output "landing_page_url" {
  description = "Landing page URL"
  value       = "https://${var.domain_name}"
}

output "landing_page_upload_command" {
  description = "Command to upload landing page files to S3"
  value       = "aws s3 sync ./landing-page s3://${aws_s3_bucket.landing_page.id}/ --delete"
}
