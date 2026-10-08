pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
    }

    triggers {
        githubPush()
        pollSCM('H/5 * * * *')
    }

    environment {
        NODE_ENV = 'test'
        CI = 'true'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm ci && npm --prefix frontend ci'
            }
        }

        stage('Typecheck') {
            steps {
                sh 'npm run typecheck && npm run frontend:typecheck'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build && npm run frontend:build'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Package') {
            steps {
                sh 'npm run package:ci'
                archiveArtifacts artifacts: 'artifacts/**, dist/**', fingerprint: true
            }
        }
    }

    post {
        success {
            echo 'Validaciones y builds completados. Artefactos disponibles en Jenkins.'
        }
        failure {
            echo 'El pipeline falló. Revisar el log de la etapa correspondiente.'
        }
        always {
            deleteDir()
        }
    }
}

