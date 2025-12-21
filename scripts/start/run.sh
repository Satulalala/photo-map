#!/bin/bash

# 地图相册 - 开发工具 (Linux/macOS)

show_menu() {
    clear
    echo "========================================"
    echo "         地图相册 - 开发工具"
    echo "========================================"
    echo ""
    echo "请选择要执行的操作："
    echo ""
    echo "[1] 安装依赖 (npm install)"
    echo "[2] 启动 Electron 版本开发服务器"
    echo "[3] 启动 Web 版本开发服务器"
    echo "[4] 构建 Electron 版本"
    echo "[5] 构建 Web 版本"
    echo "[6] 构建所有版本"
    echo "[7] 运行测试"
    echo "[8] 项目设置向导"
    echo "[9] 清理缓存"
    echo "[0] 退出"
    echo ""
}

install_deps() {
    echo ""
    echo "正在安装依赖..."
    npm install
    if [ $? -eq 0 ]; then
        echo "依赖安装完成！"
    else
        echo "安装失败！请检查网络连接和 Node.js 版本"
    fi
    read -p "按回车键继续..."
}

dev_electron() {
    echo ""
    echo "启动 Electron 版本开发服务器..."
    echo "提示：应用将在几秒钟后自动打开"
    npm run dev
    read -p "按回车键继续..."
}

dev_web() {
    echo ""
    echo "启动 Web 版本开发服务器..."
    echo "提示：请在浏览器中访问 http://localhost:3001"
    npm run web:dev
    read -p "按回车键继续..."
}

build_electron() {
    echo ""
    echo "构建 Electron 版本..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "Electron 版本构建完成！"
        echo "输出目录：build/"
    else
        echo "构建失败！"
    fi
    read -p "按回车键继续..."
}

build_web() {
    echo ""
    echo "构建 Web 版本..."
    npm run web:build
    if [ $? -eq 0 ]; then
        echo "Web 版本构建完成！"
        echo "输出目录：dist-web/"
    else
        echo "构建失败！"
    fi
    read -p "按回车键继续..."
}

build_all() {
    echo ""
    echo "构建所有版本..."
    npm run build:all
    if [ $? -eq 0 ]; then
        echo "所有版本构建完成！"
        echo "Electron 版本：build/"
        echo "Web 版本：dist-web/"
    else
        echo "构建失败！"
    fi
    read -p "按回车键继续..."
}

run_test() {
    echo ""
    echo "运行测试..."
    npm test
    read -p "按回车键继续..."
}

setup_project() {
    echo ""
    echo "启动项目设置向导..."
    npm run setup
    read -p "按回车键继续..."
}

clean_cache() {
    echo ""
    echo "清理缓存和构建文件..."
    rm -rf node_modules build dist-web dist
    echo "清理完成！"
    echo "请重新运行 '安装依赖' 选项"
    read -p "按回车键继续..."
}

# 主循环
while true; do
    show_menu
    read -p "请输入选项 (0-9): " choice
    
    case $choice in
        1) install_deps ;;
        2) dev_electron ;;
        3) dev_web ;;
        4) build_electron ;;
        5) build_web ;;
        6) build_all ;;
        7) run_test ;;
        8) setup_project ;;
        9) clean_cache ;;
        0) 
            echo ""
            echo "感谢使用地图相册开发工具！"
            echo ""
            exit 0
            ;;
        *)
            echo "无效选项，请重新选择..."
            read -p "按回车键继续..."
            ;;
    esac
done