import React, { useState } from 'react';
import { Activity, ShieldAlert, Navigation } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const SplashScreen = ({ onLogin, onGuest, session }) => {
  const [view, setView] = useState('main'); // main, login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      onLogin();
    }
  };

  return (
    <div className="splash-overlay">
      <div className="splash-container">
        <div className="splash-logo">
          <div className="splash-logo-circle">
            <Activity size={40} color="white" />
          </div>
        </div>
        
        {view === 'main' && (
          <>
            <div>
              <h1 className="splash-title">Cusco Seguro</h1>
              <p className="splash-subtitle">Plataforma Operativa de Logística y Cuadrillas</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="splash-btn primary" onClick={() => setView('login')}>
                <ShieldAlert size={18} /> Entrar como Supervisor (Admin)
              </button>
              <button className="splash-btn secondary" onClick={onGuest}>
                Continuar como Invitado
              </button>
            </div>
          </>
        )}

        {view === 'login' && (
          <>
            <div>
              <h1 className="splash-title">Acceso Restringido</h1>
              <p className="splash-subtitle">Inicia sesión como supervisor</p>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                className="splash-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                className="splash-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="splash-btn primary" disabled={loading}>
                {loading ? 'Verificando...' : <><Navigation size={18} /> Ingresar al Dashboard</>}
              </button>
            </form>
            <button className="splash-back" onClick={() => setView('main')} style={{ background: 'transparent' }}>
              Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
};
