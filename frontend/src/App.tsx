import { useState } from 'react';

function App() {
  const [response, setResponse] = useState<any>(null);
  const [token, setToken] = useState<string>('');

  const [registerData, setRegisterData] = useState({
    companyName: 'Tech Corp',
    firstName: 'Rahul',
    lastName: 'Patil',
    email: 'rahul@techcorp.com',
    password: 'securepassword123',
  });

  const [loginData, setLoginData] = useState({
    email: 'rahul@techcorp.com',
    password: 'securepassword123',
  });

  const [projectData, setProjectData] = useState({
    name: 'Website Redesign',
    description: 'Redesigning the corporate website',
  });

  const handleRegister = async () => {
    try {
      setResponse({ loading: true });
      const res = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });
      const data = await res.json();
      setResponse({ status: res.status, data });
      if (data.token) setToken(data.token);
    } catch (error: any) {
      setResponse({ error: error.message });
    }
  };

  const handleLogin = async () => {
    try {
      setResponse({ loading: true });
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      setResponse({ status: res.status, data });
      if (data.token) setToken(data.token);
    } catch (error: any) {
      setResponse({ error: error.message });
    }
  };

  const handleCreateProject = async () => {
    try {
      setResponse({ loading: true });
      const res = await fetch('http://localhost:5000/api/v1/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(projectData),
      });
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (error: any) {
      setResponse({ error: error.message });
    }
  };

  const handleGetProjects = async () => {
    try {
      setResponse({ loading: true });
      const res = await fetch('http://localhost:5000/api/v1/projects', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
      });
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (error: any) {
      setResponse({ error: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-purple-600">TenantFlow API Tester</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Register Form */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Register Company</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Company Name" className="w-full p-2 border rounded"
                value={registerData.companyName} onChange={e => setRegisterData({...registerData, companyName: e.target.value})} />
              <input type="email" placeholder="Email" className="w-full p-2 border rounded"
                value={registerData.email} onChange={e => setRegisterData({...registerData, email: e.target.value})} />
              <button onClick={handleRegister} className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition">
                Register
              </button>
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Login</h2>
            <div className="space-y-3">
              <input type="email" placeholder="Email" className="w-full p-2 border rounded"
                value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
              <input type="password" placeholder="Password" className="w-full p-2 border rounded"
                value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
              <button onClick={handleLogin} className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition">
                Login
              </button>
            </div>
          </div>

          {/* Projects Actions */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Projects (Tenant Isolation Test)</h2>
            <p className="text-sm text-gray-500 mb-4">
              Requires Login! Create a project, then load projects. You will ONLY see projects created by your company.
            </p>
            
            <div className="flex gap-4">
              <div className="flex-1 space-y-3 border-r pr-4">
                <input type="text" placeholder="Project Name" className="w-full p-2 border rounded"
                  value={projectData.name} onChange={e => setProjectData({...projectData, name: e.target.value})} />
                <button onClick={handleCreateProject} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">
                  Create Project
                </button>
              </div>
              <div className="flex-1 flex flex-col justify-center pl-4">
                <button onClick={handleGetProjects} className="w-full bg-indigo-600 text-white p-4 rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition">
                  LOAD MY PROJECTS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Response Viewer */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto shadow-inner h-72">
          <h3 className="text-white font-mono mb-2">API Response: {token ? '(Token Attached to Requests ✓)' : '(No Token ❌)'}</h3>
          <pre className="font-mono text-sm whitespace-pre-wrap">
            {response ? JSON.stringify(response, null, 2) : '// Click a button to see response here'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;
