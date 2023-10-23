terraform {
  required_providers {
    heroku = {
      source  = "heroku/heroku"
      version = "~> 5.0"
    }
  }
}

variable "app_name" {
  description = "Name of the Heroku app"
  type = string
  default = "felipe_souza_playmakers_assignment"
}

resource "heroku_app" "playmakers_assignment" {
  name   = var.app_name
  region = "us"
}

resource "heroku_build" "playmakers_build" {
  app_id     = heroku_app.playmakers_assignment.id
  buildpacks = ["https://github.com/heroku/heroku-buildpack-nodejs.git"]

  source {
    url     = "https://github.com/fsouza-fs/playmakers-assignment/archive/v1.0.0.tar.gz"
    version = "1.0.0"
  }
}

# Launch the app's web process by scaling-up
resource "heroku_formation" "example" {
  app_id     = heroku_app.playmakers_assignment.id
  type       = "web"
  quantity   = 1
  size       = "Free"
  depends_on = [heroku_build.playmakers_build]
}

output "app_url" {
  value = heroku_app.playmakers_assignment.web_url
}