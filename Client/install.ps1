# Study Buddy Finder - Installation & Setup Script

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Study Buddy Finder - Installation Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "OK Node.js found: $nodeVersion" -ForegroundColor Green

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm is not installed!" -ForegroundColor Red
    exit 1
}
Write-Host "OK npm found: v$npmVersion" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "OK Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "OK .env file created!" -ForegroundColor Green
    Write-Host "Please update .env with your configuration." -ForegroundColor Gray
} else {
    Write-Host "OK .env file already exists" -ForegroundColor Green
}
Write-Host ""

# Display success message
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review and update .env file if needed" -ForegroundColor White
Write-Host "2. Run 'npm run dev' to start development server" -ForegroundColor White
Write-Host "3. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor Cyan
Write-Host "  npm run dev      - Start development server" -ForegroundColor White
Write-Host "  npm run build    - Build for production" -ForegroundColor White
Write-Host "  npm run preview  - Preview production build" -ForegroundColor White
Write-Host "  npm run lint     - Run ESLint" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  QUICKSTART.md     - Quick start guide" -ForegroundColor White
Write-Host "  DOCUMENTATION.md  - Full documentation" -ForegroundColor White
Write-Host "  COMPONENTS.md     - Component reference" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Magenta
