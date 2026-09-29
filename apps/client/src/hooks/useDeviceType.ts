import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isTV: boolean;
  isSmartTV: boolean;
  width: number;
}

export function useDeviceType(): DeviceInfo {
  const checkDevice = (): DeviceInfo => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    const isSmartTV = /Android.*TV|SmartTV|Tizen|webOS|HbbTV|NetCast|POV_TV/i.test(ua);
    const isMobile = width <= 767;
    const isTablet = width >= 768 && width <= 1023;
    const isTV = width >= 1024 || isSmartTV;

    return {
      isMobile,
      isTablet,
      isTV,
      isSmartTV,
      width,
    };
  };

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(checkDevice);

  useEffect(() => {
    const handleResize = () => setDeviceInfo(checkDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
}
