module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: 'venv/bin/python',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8000',
      cwd: './auth-service/backend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'discover-orbit',
      script: 'venv/bin/python',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8001',
      cwd: './mvp-mac/backend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'knowledge-core',
      script: 'venv/bin/python',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8002',
      cwd: './knowledge-core/api',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'create-orbit',
      script: 'venv/bin/python',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8003',
      cwd: './Create/create-orbit-mvp/backend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'optimize-orbit',
      script: 'venv/bin/python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8004',
      cwd: './Optimize-Orbit/optimize-orbit/backend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'visibility-orbit',
      script: 'venv/bin/python',
      args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8005',
      cwd: './Visibility-orbit/visibility-orbit/backend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
