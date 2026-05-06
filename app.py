"""
ScoreAIManage Frontend for Hugging Face Spaces
部署到 https://huggingface.co/spaces/StephenZao/scoreaimanage
"""

import os
import subprocess
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder='out', static_url_path='/')

# 启用CORS以支持API调用
CORS(app, origins=[
    'https://scoreaimanage.onrender.com',
    'https://huggingface.co',
    'http://localhost:3000'
])

# 后端API地址
BACKEND_URL = os.getenv('BACKEND_URL', 'https://scoreaimanage.onrender.com')

@app.route('/')
def serve_index():
    """提供主页面"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """提供静态文件"""
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/config')
def get_config():
    """提供前端配置信息"""
    return jsonify({
        'backend_url': BACKEND_URL,
        'api_base': f'{BACKEND_URL}/api',
        'version': '1.0.0',
        'environment': 'production'
    })

@app.route('/health')
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'ScoreAIManage Frontend',
        'platform': 'Hugging Face Spaces',
        'backend_url': BACKEND_URL
    })

def build_frontend():
    """构建前端应用"""
    print("🔨 构建前端应用...")
    try:
        # 检查是否已构建
        if not os.path.exists('out'):
            # 临时重命名 API 路由文件夹以排除静态导出
            api_path = 'app/api'
            api_backup = 'app/_api_backup'
            api_moved = False
            
            if os.path.exists(api_path):
                print("📁 临时排除 API 路由以支持静态导出...")
                os.rename(api_path, api_backup)
                api_moved = True
            
            try:
                # 运行Next.js构建
                result = subprocess.run(
                    ['npm', 'run', 'build'],
                    capture_output=True,
                    text=True
                )
                
                # 恢复 API 路由文件夹
                if api_moved and os.path.exists(api_backup):
                    os.rename(api_backup, api_path)
                
                if result.returncode != 0:
                    print(f"❌ 构建失败: {result.stderr}")
                    return False
                print("✅ 前端构建成功")
            except Exception as e:
                # 确保恢复 API 文件夹即使构建失败
                if api_moved and os.path.exists(api_backup):
                    os.rename(api_backup, api_path)
                raise e
        else:
            print("✅ 前端已构建")
        return True
    except Exception as e:
        print(f"❌ 构建错误: {e}")
        return False

if __name__ == '__main__':
    # 构建前端
    if build_frontend():
        print(f"🚀 启动前端服务器...")
        print(f"📡 后端API: {BACKEND_URL}")
        print(f"🌐 前端地址: https://huggingface.co/spaces/StephenZao/scoreaimanage")
        
        # 启动Flask服务器
        app.run(
            host='0.0.0.0',
            port=7860,
            debug=False
        )
    else:
        print("❌ 前端构建失败，无法启动服务器")
