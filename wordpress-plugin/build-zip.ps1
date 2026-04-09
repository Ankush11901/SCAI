Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "C:\Users\HP\OneDrive\Documents\seocontent-article-generator\wordpress-plugin\seo-content-ai.zip"
$sourceDir = "C:\Users\HP\OneDrive\Documents\seocontent-article-generator\wordpress-plugin\seo-content-ai"

if (Test-Path $zipPath) { Remove-Item $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

Get-ChildItem -Path $sourceDir -Recurse -File | ForEach-Object {
    $relPath = $_.FullName.Substring($sourceDir.Length + 1).Replace("\", "/")
    $entryName = "seo-content-ai/" + $relPath
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
}

$zip.Dispose()
Write-Host "Created $zipPath"
