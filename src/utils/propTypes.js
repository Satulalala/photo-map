/**
 * 自定义 PropTypes 验证器
 * 
 * 提供常用的属性类型验证，确保组件接收正确的 props
 * 
 * @example
 * import { PhotoPropTypes, MarkerPropTypes } from './utils/propTypes';
 * 
 * MyComponent.propTypes = {
 *   photo: PhotoPropTypes.photo,
 *   marker: MarkerPropTypes.marker,
 * };
 */

import PropTypes from 'prop-types';

// ========== 照片相关 PropTypes ==========

/**
 * 照片对象的 PropTypes
 */
export const PhotoShape = {
  /** 照片唯一标识 */
  id: PropTypes.string.isRequired,
  
  /** 照片数据（base64 或 URL） */
  data: PropTypes.string,
  
  /** 缩略图数据 */
  thumbnail: PropTypes.string,
  
  /** 照片备注 */
  note: PropTypes.string,
  
  /** 创建时间 */
  createdAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
  
  /** 文件大小（字节） */
  size: PropTypes.number,
  
  /** 文件类型 */
  type: PropTypes.string,
  
  /** 图片宽度 */
  width: PropTypes.number,
  
  /** 图片高度 */
  height: PropTypes.number,
};

export const PhotoPropTypes = {
  /** 单个照片对象 */
  photo: PropTypes.shape(PhotoShape),
  
  /** 照片数组 */
  photos: PropTypes.arrayOf(PropTypes.shape(PhotoShape)),
  
  /** 照片 ID */
  photoId: PropTypes.string,
  
  /** 照片索引 */
  photoIndex: PropTypes.number,
};

// ========== 标记相关 PropTypes ==========

/**
 * 标记对象的 PropTypes
 */
export const MarkerShape = {
  /** 标记唯一标识 */
  id: PropTypes.string.isRequired,
  
  /** 纬度 */
  lat: PropTypes.number.isRequired,
  
  /** 经度 */
  lng: PropTypes.number.isRequired,
  
  /** 地点名称 */
  name: PropTypes.string,
  
  /** 照片数量 */
  photoCount: PropTypes.number,
  
  /** 第一张照片（用于预览） */
  firstPhoto: PropTypes.shape(PhotoShape),
  
  /** 创建时间 */
  createdAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
  
  /** 更新时间 */
  updatedAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
};

export const MarkerPropTypes = {
  /** 单个标记对象 */
  marker: PropTypes.shape(MarkerShape),
  
  /** 标记数组 */
  markers: PropTypes.arrayOf(PropTypes.shape(MarkerShape)),
  
  /** 标记 ID */
  markerId: PropTypes.string,
};

// ========== 地图相关 PropTypes ==========

/**
 * 坐标对象的 PropTypes
 */
export const CoordinateShape = {
  /** 纬度 */
  lat: PropTypes.number.isRequired,
  
  /** 经度 */
  lng: PropTypes.number.isRequired,
};

/**
 * 边界框的 PropTypes
 */
export const BoundsShape = {
  /** 最小纬度 */
  minLat: PropTypes.number.isRequired,
  
  /** 最大纬度 */
  maxLat: PropTypes.number.isRequired,
  
  /** 最小经度 */
  minLng: PropTypes.number.isRequired,
  
  /** 最大经度 */
  maxLng: PropTypes.number.isRequired,
};

export const MapPropTypes = {
  /** 坐标对象 */
  coordinate: PropTypes.shape(CoordinateShape),
  
  /** 边界框 */
  bounds: PropTypes.shape(BoundsShape),
  
  /** 缩放级别 */
  zoom: PropTypes.number,
  
  /** 地图样式 */
  mapStyle: PropTypes.oneOf([
    'streets',
    'satellite',
    'dark',
    'light',
    'outdoors',
  ]),
};

// ========== UI 相关 PropTypes ==========

/**
 * 尺寸的 PropTypes
 */
export const SizeShape = {
  /** 宽度 */
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  
  /** 高度 */
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export const UIPropTypes = {
  /** 尺寸对象 */
  size: PropTypes.shape(SizeShape),
  
  /** 是否可见 */
  visible: PropTypes.bool,
  
  /** 是否禁用 */
  disabled: PropTypes.bool,
  
  /** 是否加载中 */
  loading: PropTypes.bool,
  
  /** 类名 */
  className: PropTypes.string,
  
  /** 样式对象 */
  style: PropTypes.object,
  
  /** 子元素 */
  children: PropTypes.node,
};

// ========== 事件处理 PropTypes ==========

export const EventPropTypes = {
  /** 点击事件处理器 */
  onClick: PropTypes.func,
  
  /** 双击事件处理器 */
  onDoubleClick: PropTypes.func,
  
  /** 鼠标进入事件处理器 */
  onMouseEnter: PropTypes.func,
  
  /** 鼠标离开事件处理器 */
  onMouseLeave: PropTypes.func,
  
  /** 变化事件处理器 */
  onChange: PropTypes.func,
  
  /** 提交事件处理器 */
  onSubmit: PropTypes.func,
  
  /** 关闭事件处理器 */
  onClose: PropTypes.func,
  
  /** 完成事件处理器 */
  onComplete: PropTypes.func,
  
  /** 错误事件处理器 */
  onError: PropTypes.func,
};

// ========== 通用验证器 ==========

/**
 * 创建范围验证器
 * 
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {Function} PropTypes 验证器
 * 
 * @example
 * MyComponent.propTypes = {
 *   zoom: createRangeValidator(1, 20),
 * };
 */
export function createRangeValidator(min, max) {
  return function (props, propName, componentName) {
    const value = props[propName];
    
    if (value === undefined || value === null) {
      return null; // 允许 undefined/null
    }
    
    if (typeof value !== 'number') {
      return new Error(
        `Invalid prop \`${propName}\` of type \`${typeof value}\` ` +
        `supplied to \`${componentName}\`, expected \`number\`.`
      );
    }
    
    if (value < min || value > max) {
      return new Error(
        `Invalid prop \`${propName}\` of value \`${value}\` ` +
        `supplied to \`${componentName}\`, expected value between ${min} and ${max}.`
      );
    }
    
    return null;
  };
}

/**
 * 创建枚举验证器（带自定义错误消息）
 * 
 * @param {Array} allowedValues - 允许的值数组
 * @param {string} typeName - 类型名称（用于错误消息）
 * @returns {Function} PropTypes 验证器
 * 
 * @example
 * MyComponent.propTypes = {
 *   status: createEnumValidator(['pending', 'success', 'error'], 'Status'),
 * };
 */
export function createEnumValidator(allowedValues, typeName = 'value') {
  return function (props, propName, componentName) {
    const value = props[propName];
    
    if (value === undefined || value === null) {
      return null;
    }
    
    if (!allowedValues.includes(value)) {
      return new Error(
        `Invalid ${typeName} \`${value}\` supplied to \`${componentName}\`. ` +
        `Expected one of: ${allowedValues.join(', ')}.`
      );
    }
    
    return null;
  };
}

/**
 * 创建坐标验证器
 * 
 * @returns {Function} PropTypes 验证器
 */
export function createCoordinateValidator() {
  return function (props, propName, componentName) {
    const value = props[propName];
    
    if (value === undefined || value === null) {
      return null;
    }
    
    if (typeof value !== 'object') {
      return new Error(
        `Invalid prop \`${propName}\` supplied to \`${componentName}\`, ` +
        `expected an object with \`lat\` and \`lng\` properties.`
      );
    }
    
    const { lat, lng } = value;
    
    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      return new Error(
        `Invalid latitude in prop \`${propName}\` supplied to \`${componentName}\`. ` +
        `Expected a number between -90 and 90.`
      );
    }
    
    if (typeof lng !== 'number' || lng < -180 || lng > 180) {
      return new Error(
        `Invalid longitude in prop \`${propName}\` supplied to \`${componentName}\`. ` +
        `Expected a number between -180 and 180.`
      );
    }
    
    return null;
  };
}

// ========== 导出所有 ==========

export default {
  PhotoShape,
  PhotoPropTypes,
  MarkerShape,
  MarkerPropTypes,
  CoordinateShape,
  BoundsShape,
  MapPropTypes,
  SizeShape,
  UIPropTypes,
  EventPropTypes,
  createRangeValidator,
  createEnumValidator,
  createCoordinateValidator,
};