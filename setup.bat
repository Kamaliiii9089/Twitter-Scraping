@echo off
echo 🚀 Setting up Twitter Scraper UI...

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📋 Creating .env file...
    copy .env.example .env
    echo ✅ Created .env file - please configure it with your settings
) else (
    echo ✅ .env file already exists
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
npm install

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd client && npm install && cd ..

echo.
echo 🎉 Setup complete!
echo.
echo 📝 Next steps:
echo 1. Edit .env file with your Twitter cookie and other settings
echo 2. Run 'npm run dev' to start development server
echo 3. Open http://localhost:3000 in your browser
echo.
pause
