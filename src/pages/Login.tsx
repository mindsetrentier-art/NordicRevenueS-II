import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3 } from 'lucide-react';

export function Login() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      await login();
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError("Ce domaine n'est pas autorisé. Ajoutez-le dans la console Firebase.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("La fenêtre de connexion a été fermée.");
      } else {
        setError("Une erreur est survenue lors de la connexion. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-sm mb-4">
            <BarChart3 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">NordicRevenueS</h1>
          <p className="text-slate-500 mt-2 text-center">
            Pilotez vos revenus multi-sites avec clarté.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-5 h-5"
          />
          Continuer avec Google
        </button>

        <div className="mt-8 text-center text-sm text-slate-500">
          En vous connectant, vous acceptez nos <a href="#" className="text-blue-600 hover:underline">Conditions Générales</a>.
        </div>
      </div>
    </div>
  );
}
