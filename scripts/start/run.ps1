# 地图相册 - 开发工具 (PowerShell)

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "         地图相册 - 开发工具" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "请选择要执行的操作：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[1] 安装依赖 (npm install)" -ForegroundColor White
    Write-Host "[2] 启动 Electron 版本开发服务器" -ForegroundColor White
    Write-Host "[3] 启动 Web 版本开发服务器" -ForegroundColor White
    Write-Host "[4] 构建 Electron 版本" -ForegroundColor White
    Write-Host "[5] 构建 Web 版本" -ForegroundColor White
    Write-Host "[6] 构建所有版本" -ForegroundColor White
    Write-Host "[7] 运行测试" -ForegroundColor White
    Write-Host "[8] 项目设置向导" -ForegroundColor White
    Write-Host "[9] 清理缓存" -ForegroundColor White
    Write-Host "[0] 退出" -ForegroundColor Red
    Write-Host ""
}

function Install-Dependencies {
    Write-Host ""
    Write-Host "正在安装依赖..." -ForegroundColor Green
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "依赖安装完成！" -ForegroundColor Green
    } else {
        Write-Host "安装失败！请检查网络连接和 Node.js 版本" -ForegroundColor Red
    }
    Read-Host "按回车键继续"
}

function Start-ElectronDev {
    Write-Host ""
    Write-Host "启动 Electron 版本开发服务器..." -ForegroundColor Green
    Write-Host "提示：应用将在几秒钟后自动打开" -ForegroundColor Yellow
    npm run dev
    Read-Host "按回车键继续"
}

function Start-WebDev {
    Write-Host ""
    Write-Host "启动 Web 版本开发服务器..." -ForegroundColor Green
    Write-Host "提示：请在浏览器中访问 http://localhost:3001" -ForegroundColor Yellow
    npm run web:dev
    Read-Host "按回车键继续"
}

function Build-Electron {
    Write-Host ""
    Write-Host "构建 Electron 版本..." -ForegroundColor Green
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Electron 版本构建完成！" -ForegroundColor Green
        Write-Host "输出目录：build/" -ForegroundColor Cyan
    } else {
        Write-Host "构建失败！" -ForegroundColor Red
    }
    Read-Host "按回车键继续"
}

function Build-Web {
    Write-Host ""
    Write-Host "构建 Web 版本..." -ForegroundColor Green
    npm run web:build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Web 版本构建完成！" -ForegroundColor Green
        Write-Host "输出目录：dist-web/" -ForegroundColor Cyan
    } else {
        Write-Host "构建失败！" -ForegroundColor Red
    }
    Read-Host "按回车键继续"
}

function Build-All {
    Write-Host ""
    Write-Host "构建所有版本..." -ForegroundColor Green
    npm run build:all
    if ($LASTEXITCODE -eq 0) {
        Write-Host "所有版本构建完成！" -ForegroundColor Green
        Write-Host "Electron 版本：build/" -ForegroundColor Cyan
        Write-Host "Web 版本：dist-web/" -ForegroundColor Cyan
    } else {
        Write-Host "构建失败！" -ForegroundColor Red
    }
    Read-Host "按回车键继续"
}

function Run-Tests {
    Write-Host ""
    Write-Host "运行测试..." -ForegroundColor Green
    npm test
    Read-Host "按回车键继续"
}

function Setup-Project {
    Write-Host ""
    Write-Host "启动项目设置向导..." -ForegroundColor Green
    npm run setup
    Read-Host "按回车键继续"
}

function Clean-Cache {
    Write-Host ""
    Write-Host "清理缓存和构建文件..." -ForegroundColor Green
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    if (Test-Path "dist-web") { Remove-Item -Recurse -Force "dist-web" }
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    Write-Host "清理完成！" -ForegroundColor Green
    Write-Host "请重新运行 '安装依赖' 选项" -ForegroundColor Yellow
    Read-Host "按回车键继续"
}

# 主循环
do {
    Show-Menu
    $choice = Read-Host "请输入选项 (0-9)"
    
    switch ($choice) {
        "1" { Install-Dependencies }
        "2" { Start-ElectronDev }
        "3" { Start-WebDev }
        "4" { Build-Electron }
        "5" { Build-Web }
        "6" { Build-All }
        "7" { Run-Tests }
        "8" { Setup-Project }
        "9" { Clean-Cache }
        "0" { 
            Write-Host ""
            Write-Host "感谢使用地图相册开发工具！" -ForegroundColor Green
            Write-Host ""
            exit 
        }
        default {
            Write-Host "无效选项，请重新选择..." -ForegroundColor Red
            Read-Host "按回车键继续"
        }
    }
} while ($true)