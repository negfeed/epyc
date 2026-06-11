package com.negfeed.epyc.core

import kotlinx.serialization.json.Json
import java.io.File

/** Locates and decodes the shared golden vectors at <repo>/tools/golden. */
object GoldenLoader {
    val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private fun repoRoot(): File {
        System.getProperty("epyc.repoRoot")?.let { return File(it) }
        // Fallback: walk up from the working dir until tools/golden is found.
        var dir: File? = File(System.getProperty("user.dir"))
        while (dir != null) {
            if (File(dir, "tools/golden").isDirectory) return dir
            dir = dir.parentFile
        }
        error("Could not locate repo root containing tools/golden")
    }

    fun read(name: String): String =
        File(repoRoot(), "tools/golden/$name").readText()
}
