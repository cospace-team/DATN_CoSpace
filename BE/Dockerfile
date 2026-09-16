# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
# Uses the maven image rather than ./mvnw so the build does not depend on the
# wrapper downloading a Maven distribution over the network on every deploy.
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

# Resolve dependencies in their own layer: rebuilt only when pom.xml changes,
# not on every source edit. Cuts redeploy time substantially.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src/ src/
RUN mvn -B -q clean package -DskipTests

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Never run as root.
RUN addgroup -S app && adduser -S -G app app

COPY --from=build /build/target/*.jar app.jar
USER app

# Render injects $PORT and routes traffic to it; 8080 is only the local default.
EXPOSE 8080

# MaxRAMPercentage (not -Xmx) so the heap tracks whatever the container is given.
# SerialGC beats G1 on a single small instance: less overhead, smaller footprint.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom"

# exec form via sh so $JAVA_OPTS expands while the JVM still receives SIGTERM as PID 1.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
