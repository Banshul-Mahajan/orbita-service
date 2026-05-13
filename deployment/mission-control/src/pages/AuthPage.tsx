import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [selectedPills, setSelectedPills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Marketing Manager');
  const [workspaceType, setWorkspaceType] = useState('Brand');
  const navigate = useNavigate();

  const handlePillClick = (pill: string) => {
    if (selectedPills.includes(pill)) {
      setSelectedPills(selectedPills.filter(p => p !== pill));
    } else {
      setSelectedPills([...selectedPills, pill]);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let response;
      if (isLogin) {
        response = await apiClient.post('/auth/login', {
          email,
          password
        });
      } else {
        // Construct org_name from full name or default
        const orgName = fullName ? `${fullName.split(' ')[0]}'s ${workspaceType}` : `My ${workspaceType}`;
        
        response = await apiClient.post('/auth/register', {
          org_name: orgName,
          email,
          password,
          full_name: fullName
        });
      }

      // Save token — localStorage for MC, cookie for module clients (Visibility, Create, etc.)
      if (response.data && response.data.access_token) {
        const token = response.data.access_token;
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify({
          user_id: response.data.user_id,
          org_id: response.data.org_id,
          email: response.data.email,
          full_name: response.data.full_name,
          org_name: response.data.org_name,
          company_name: response.data.org_name,
        }));
        // Also set orbit_token cookie so module API clients can find it
        document.cookie = `orbit_token=${token};path=/;max-age=86400;SameSite=Lax`;
        // Set org context cookie for modules that need it
        if (response.data.org_id) {
          document.cookie = `orbit_org_id=${response.data.org_id};path=/;max-age=86400;SameSite=Lax`;
        }
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("Auth error", error);
      setErrorMsg(error.response?.data?.detail || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Pane (Dark with image) */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="logo-section">
            <div className="logo-icon">O</div>
            <div className="logo-text">
              <h1>ORBITA</h1>
              <p>One Orbit. Total Visibility.</p>
            </div>
          </div>
          
          <div className="auth-hero">
            <h2>VISIBILITY OPERATING SYSTEM</h2>
            <h3>Set up your brand for SEO, GEO, and AI-driven content intelligence.</h3>
            <p>Create an account first, then ORBITA will guide you through company onboarding, competitors, keywords, prompts, integrations, and the first visibility scan.</p>
          </div>
        </div>

        <div className="auth-cards">
          <div className="auth-card">
            <h4>SEO</h4>
            <p>Keywords, rankings, site health, schema, and content gaps.</p>
          </div>
          <div className="auth-card">
            <h4>GEO</h4>
            <p>AI prompt visibility across ChatGPT, Gemini, Perplexity, Claude, and Copilot.</p>
          </div>
          <div className="auth-card">
            <h4>Content</h4>
            <p>Brand voice, Knowledge Core, verified facts, and content workflows.</p>
          </div>
        </div>
      </div>

      {/* Right Pane (Auth Form) */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-tabs">
            <div 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Sign up
            </div>
            <div 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Log in
            </div>
          </div>

          <div className="auth-form-header">
            <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
            <p>{isLogin ? 'Enter your details to log in.' : 'Start with your account details. Company onboarding begins next.'}</p>
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '1rem', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth}>
            {!isLogin && (
              <div className="form-group">
                <label>Full name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Aarav Mehta" 
                  required 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Work email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@company.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Minimum 8 characters" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Your role</label>
                  <select 
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option>Marketing Manager</option>
                    <option>SEO Specialist</option>
                    <option>Founder / CEO</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Workspace type</label>
                  <select 
                    className="form-select"
                    value={workspaceType}
                    onChange={(e) => setWorkspaceType(e.target.value)}
                  >
                    <option>Brand</option>
                    <option>Agency</option>
                    <option>Personal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Primary use case</label>
                  <div className="pills-container">
                    {['SEO growth', 'AI visibility', 'Content creation', 'Technical audits', 'Competitor tracking', 'Client reporting'].map(pill => (
                      <div 
                        key={pill} 
                        className={`pill ${selectedPills.includes(pill) ? 'selected' : ''}`}
                        onClick={() => handlePillClick(pill)}
                      >
                        {pill}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isLogin ? 'Log in' : 'Create account and onboard company')}
            </button>
          </form>

          <div className="divider">or continue with</div>

          <div className="social-btns">
            <button className="btn-social">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="18" height="18" />
              Google
            </button>
            <button className="btn-social">
              <img src="https://www.svgrepo.com/show/475662/microsoft-color.svg" alt="Microsoft" width="18" height="18" />
              Microsoft
            </button>
          </div>

          <div className="auth-footer">
            {isLogin ? (
              <>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(false); }}>Sign up</a></>
            ) : (
              <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(true); }}>Log in</a></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
