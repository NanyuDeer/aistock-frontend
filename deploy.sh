#!/bin/bash

# 定义颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 定义路径
SOURCE_DIR="/root/projects/aistock/frontend"
DIST_DIR="$SOURCE_DIR/dist"
TARGET_DIR="/opt/1panel/apps/openresty/openresty/www/sites/aistocklink.cn/index"

# 显示开始信息
echo -e "${YELLOW}=== 开始部署 AI Stock Link 前端项目 ===${NC}"

# 进入前端项目目录
echo -e "进入项目目录: ${SOURCE_DIR}"
cd $SOURCE_DIR || { echo -e "${RED}错误: 无法进入前端项目目录${NC}"; exit 1; }

# 构建Vue项目
echo -e "${YELLOW}开始构建Vue项目...${NC}"
npm run build || { echo -e "${RED}错误: Vue项目构建失败${NC}"; exit 1; }
echo -e "${GREEN}Vue项目构建成功!${NC}"

# 检查目标目录是否存在
echo -e "检查目标部署目录: ${TARGET_DIR}"
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "目标目录不存在，创建目录..."
  mkdir -p $TARGET_DIR || { echo -e "${RED}错误: 无法创建目标目录${NC}"; exit 1; }
fi

# 清空目标目录
echo -e "清空目标目录..."
rm -rf $TARGET_DIR/* || { echo -e "${RED}错误: 清空目标目录失败${NC}"; exit 1; }

# 复制新构建的文件到目标目录
echo -e "部署新构建的文件..."
cp -a $DIST_DIR/* $TARGET_DIR/ || { echo -e "${RED}错误: 复制文件失败${NC}"; exit 1; }

# 设置文件权限
echo -e "设置文件权限..."
find $TARGET_DIR -type d -exec chmod 755 {} \;
find $TARGET_DIR -type f -exec chmod 644 {} \;

# 删除dist目录
echo -e "删除dist目录..."
rm -rf $DIST_DIR || { echo -e "${RED}错误: 删除dist目录失败${NC}"; exit 1; }

# 显示完成信息
echo -e "${GREEN}=== 部署完成! ===${NC}"
echo -e "Vue应用已成功部署到: ${TARGET_DIR}"
