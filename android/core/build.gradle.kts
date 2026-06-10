// :core — pure Kotlin/JVM module. No Android or Firebase dependencies, so it
// compiles and tests with plain Gradle/JUnit and stays in parity with the legacy
// TS logic via the shared golden vectors in <repo>/tools/golden.
plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.kotlin.plugin.serialization")
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    // kotlinx-serialization is used by both main (model @Serializable) and tests.
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    testImplementation(platform("org.junit:junit-bom:5.11.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    // The golden vectors live at <repo>/tools/golden; expose the repo root to tests.
    systemProperty("epyc.repoRoot", rootProject.projectDir.parentFile.absolutePath)
}
