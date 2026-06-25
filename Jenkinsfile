pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  triggers {
    pollSCM('H/3 * * * *')
  }

  parameters {
    string(
      name: 'APP_HEALTH_URL',
      defaultValue: 'http://127.0.0.1:8088/api/health',
      description: 'URL for post-deploy health check. Change this if APP_PORT is not 8088.'
    )
    string(
      name: 'BACKEND_REPO_URL',
      defaultValue: '',
      description: 'Git URL for OEM-backend repository.'
    )
    string(
      name: 'BACKEND_BRANCH',
      defaultValue: 'main',
      description: 'Backend branch to deploy.'
    )
    string(
      name: 'GIT_CREDENTIALS_ID',
      defaultValue: 'git-oem-token',
      description: 'Jenkins credential ID that can read both frontend and backend repositories.'
    )
  }

  environment {
    COMPOSE_PROJECT_NAME = 'oem'
    COMPOSE_FILE_PATH = 'docker-compose.yml'
    ENV_FILE = '.env.production'
    BACKEND_DIR = 'OEM-backend'
    BACKEND_CONTEXT = './OEM-backend'
  }

  stages {
    stage('Checkout Backend') {
      steps {
        script {
          if (!params.BACKEND_REPO_URL?.trim()) {
            error('BACKEND_REPO_URL is required because backend is a separate repository.')
          }
        }
        dir("${env.BACKEND_DIR}") {
          git branch: "${params.BACKEND_BRANCH}",
              credentialsId: "${params.GIT_CREDENTIALS_ID}",
              url: "${params.BACKEND_REPO_URL}"
        }
      }
    }

    stage('Preflight') {
      steps {
        script {
          runCommand(
            unix: '''
              set -eu
              test -f "$COMPOSE_FILE_PATH"
              test -f "$ENV_FILE"
              test -d "$BACKEND_DIR"
              test -f "$BACKEND_DIR/Dockerfile"
              docker version
              docker compose version
            ''',
            windows: '''
              if not exist "%COMPOSE_FILE_PATH%" exit /b 1
              if not exist "%ENV_FILE%" exit /b 1
              if not exist "%BACKEND_DIR%" exit /b 1
              if not exist "%BACKEND_DIR%\\Dockerfile" exit /b 1
              docker version
              docker compose version
            '''
          )
        }
      }
    }

    stage('Validate Compose') {
      steps {
        script {
          composeCommand('config')
        }
      }
    }

    stage('Build Images') {
      steps {
        script {
          composeCommand('build')
        }
      }
    }

    stage('Deploy') {
      steps {
        script {
          composeCommand('up -d --remove-orphans')
        }
      }
    }

    stage('Health Check') {
      steps {
        script {
          runCommand(
            unix: '''
              set -eu
              for i in $(seq 1 30); do
                if curl -fsS "$APP_HEALTH_URL" >/dev/null; then
                  echo "Health check passed: $APP_HEALTH_URL"
                  exit 0
                fi
                sleep 2
              done
              echo "Health check failed: $APP_HEALTH_URL"
              docker compose -f "$COMPOSE_FILE_PATH" --env-file "$ENV_FILE" logs --tail=120
              exit 1
            ''',
            windows: '''
              powershell -NoProfile -ExecutionPolicy Bypass -Command ^
                "$ErrorActionPreference = 'Stop';" ^
                "for ($i = 1; $i -le 30; $i++) {" ^
                "  try { Invoke-WebRequest -Uri $env:APP_HEALTH_URL -UseBasicParsing -TimeoutSec 5 | Out-Null; Write-Host \"Health check passed: $env:APP_HEALTH_URL\"; exit 0 }" ^
                "  catch { Start-Sleep -Seconds 2 }" ^
                "}" ^
                "Write-Host \"Health check failed: $env:APP_HEALTH_URL\";" ^
                "docker compose -f $env:COMPOSE_FILE_PATH --env-file $env:ENV_FILE logs --tail=120;" ^
                "exit 1"
            '''
          )
        }
      }
    }
  }

  post {
    success {
      echo 'OEM deployment completed.'
    }
    failure {
      script {
        composeCommand('ps', true)
      }
    }
  }
}

void composeCommand(String args, boolean ignoreFailure = false) {
  String command = "docker compose -f \"${env.COMPOSE_FILE_PATH}\" --env-file \"${env.ENV_FILE}\" ${args}"

  if (isUnix()) {
    sh script: command, returnStatus: ignoreFailure
  } else {
    bat script: command, returnStatus: ignoreFailure
  }
}

void runCommand(Map commands) {
  if (isUnix()) {
    sh commands.unix
  } else {
    bat commands.windows
  }
}
