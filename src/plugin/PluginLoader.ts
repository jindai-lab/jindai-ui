// src/plugin/PluginLoader.ts

import { PluginConfig } from '../types/plugin';

export class PluginLoader {
  // 从 npm 包加载插件
  async loadFromNpm(packageName: string): Promise<any> {
    try {
      const plugin = await import(packageName);
      return plugin.default || plugin;
    } catch (error) {
      console.error(`Failed to load plugin: ${packageName}`, error);
      throw error;
    }
  }
  
  // 从本地文件加载插件
  async loadFromLocal(path: string): Promise<any> {
    try {
      // For local plugins that are built as packages (like workspace packages)
      // we should import them by their package name
      if (path.startsWith('../packages/') && path.endsWith('index.ts')) {
        // Extract package name from path like "../packages/bibliothek-plugin/index.ts"
        const pathParts = path.split('/');
        const packageNameIndex = pathParts.indexOf('packages');
        if (packageNameIndex !== -1 && packageNameIndex + 1 < pathParts.length) {
          const packageName = `@jindai/${pathParts[packageNameIndex + 1]}`;
          const plugin = await import(/* @vite-ignore */ packageName);
          return plugin.default || plugin;
        }
      }
      
      // For other relative paths, try the direct import
      if (path.startsWith('../')) {
        const plugin = await import(/* @vite-ignore */ path);
        return plugin.default || plugin;
      } else {
        const plugin = await import(`../plugins/${path}`);
        return plugin.default || plugin;
      }
    } catch (error) {
      console.error(`Failed to load local plugin: ${path}`, error);
      throw error;
    }
  }
  
  // 从配置文件加载插件
  async loadFromConfig(config: PluginConfig): Promise<any> {
    const { type, source } = config;
    
    switch (type) {
      case 'npm':
        return this.loadFromNpm(source);
      case 'local':
        return this.loadFromLocal(source);
      case 'cdn':
        return this.loadFromCDN(source);
      default:
        throw new Error(`Unknown plugin type: ${type}`);
    }
  }
  
  // 从 CDN 加载插件
  async loadFromCDN(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      script.onload = () => {
        // 假设插件挂载到 window
        const plugin = (window as any).__jindaiPlugin;
        delete (window as any).__jindaiPlugin;
        resolve(plugin);
      };
      
      script.onerror = () => reject(new Error(`Failed to load plugin from CDN: ${url}`));
      document.head.appendChild(script);
    });
  }
}