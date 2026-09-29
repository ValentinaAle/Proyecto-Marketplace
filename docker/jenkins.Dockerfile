FROM node:22-bookworm-slim AS node

FROM jenkins/jenkins:latest

USER root
COPY --from=node /usr/local/ /usr/local/
USER jenkins
