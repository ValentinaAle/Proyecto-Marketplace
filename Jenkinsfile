pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
    }

    triggers {
        githubPush()
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
                script {
                    if (isUnix()) {
                        sh 'npm ci && npm --prefix frontend ci'
                    } else {
                        bat 'npm ci && npm --prefix frontend ci'
                    }
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm test'
                    } else {
                        bat 'npm test'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run frontend:build'
                    } else {
                        bat 'npm run frontend:build'
                    }
                }
            }
        }

        stage('Package') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run package:ci'
                    } else {
                        bat 'npm run package:ci'
                    }
                }
                archiveArtifacts artifacts: 'artifacts/**', fingerprint: true
            }
        }
    }

    post {
        success {
            echo 'Validaciones y build completados. Artefactos disponibles en Jenkins.'
        }
        failure {
            echo 'El pipeline fallo. Revisar el log de la etapa marcada en rojo.'
        }
        always {
            deleteDir()
        }
    }
}
