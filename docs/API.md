# API 文档

## 概述

地图相册应用的 API 接口文档，包含所有可用的端点和数据格式。

## 基础信息

- **Base URL**: `/api`
- **版本**: v1
- **认证**: 无需认证（本地应用）
- **数据格式**: JSON

## 照片管理 API

### 获取所有照片

```http
GET /api/photos
```

**查询参数**:
- `page` (number, optional): 页码，默认为 1
- `limit` (number, optional): 每页数量，默认为 20
- `sort` (string, optional): 排序方式，可选值：`date_asc`, `date_desc`, `name_asc`, `name_desc`
- `location` (string, optional): 位置筛选
- `tags` (string, optional): 标签筛选，多个标签用逗号分隔

**响应示例**:
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "1",
        "filename": "sunset-beach.jpg",
        "title": "海滩日落",
        "description": "美丽的海滩日落景色",
        "location": {
          "latitude": 39.9042,
          "longitude": 116.4074,
          "address": "北京市朝阳区"
        },
        "timestamp": "2024-01-15T18:30:00Z",
        "tags": ["日落", "海滩", "自然"],
        "thumbnail_url": "/thumbnails/sunset-beach-300.jpg"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 100,
      "per_page": 20
    }
  }
}
```

### 获取单张照片

```http
GET /api/photos/:id
```

**路径参数**:
- `id` (string): 照片ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "filename": "sunset-beach.jpg",
    "title": "海滩日落",
    "description": "美丽的海滩日落景色",
    "location": {
      "latitude": 39.9042,
      "longitude": 116.4074,
      "address": "北京市朝阳区",
      "city": "北京",
      "country": "中国"
    },
    "timestamp": "2024-01-15T18:30:00Z",
    "tags": ["日落", "海滩", "自然"],
    "camera": {
      "make": "Apple",
      "model": "iPhone 15 Pro",
      "settings": {
        "iso": 100,
        "aperture": "f/2.8",
        "shutter": "1/60s",
        "focal_length": "24mm"
      }
    },
    "dimensions": {
      "width": 4032,
      "height": 3024
    },
    "file_size": 2048576,
    "original_url": "/photos/sunset-beach.jpg",
    "thumbnail_urls": {
      "small": "/thumbnails/sunset-beach-150.jpg",
      "medium": "/thumbnails/sunset-beach-300.jpg",
      "large": "/thumbnails/sunset-beach-600.jpg"
    },
    "created_at": "2024-01-15T18:30:00Z",
    "updated_at": "2024-01-15T18:30:00Z"
  }
}
```

### 上传照片

```http
POST /api/photos
```

**请求体** (multipart/form-data):
- `file` (file): 照片文件
- `title` (string, optional): 照片标题
- `description` (string, optional): 照片描述
- `tags` (string, optional): 标签，多个标签用逗号分隔

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "new-photo-id",
    "filename": "uploaded-photo.jpg",
    "message": "照片上传成功"
  }
}
```

### 更新照片信息

```http
PUT /api/photos/:id
```

**路径参数**:
- `id` (string): 照片ID

**请求体**:
```json
{
  "title": "新标题",
  "description": "新描述",
  "tags": ["标签1", "标签2"]
}
```

### 删除照片

```http
DELETE /api/photos/:id
```

**路径参数**:
- `id` (string): 照片ID

## 地图 API

### 获取地图上的照片点

```http
GET /api/map/photos
```

**查询参数**:
- `bounds` (string): 地图边界，格式：`sw_lat,sw_lng,ne_lat,ne_lng`
- `zoom` (number): 当前缩放级别

**响应示例**:
```json
{
  "success": true,
  "data": {
    "clusters": [
      {
        "id": "cluster-1",
        "latitude": 39.9042,
        "longitude": 116.4074,
        "count": 5,
        "photos": ["1", "2", "3", "4", "5"]
      }
    ],
    "photos": [
      {
        "id": "6",
        "latitude": 31.2304,
        "longitude": 121.4737,
        "thumbnail_url": "/thumbnails/photo-6-150.jpg"
      }
    ]
  }
}
```

## 搜索 API

### 搜索照片

```http
GET /api/search
```

**查询参数**:
- `q` (string): 搜索关键词
- `type` (string, optional): 搜索类型，可选值：`title`, `description`, `tags`, `location`, `all`
- `page` (number, optional): 页码
- `limit` (number, optional): 每页数量

## 错误响应

所有错误响应都遵循以下格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息"
  }
}
```

### 常见错误码

- `PHOTO_NOT_FOUND`: 照片不存在
- `INVALID_FILE_TYPE`: 不支持的文件类型
- `FILE_TOO_LARGE`: 文件过大
- `UPLOAD_FAILED`: 上传失败
- `DATABASE_ERROR`: 数据库错误
- `INVALID_PARAMETERS`: 参数错误