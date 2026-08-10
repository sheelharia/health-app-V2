import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { queryClient } from './lib/queryClient';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { Insights } from './pages/Insights';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { Home as HomeIcon, UtensilsCrossed, BarChart2 } from 'lucide-react';
import { FoodSearch } from './components/foods/FoodSearch';
import { useState } from 'react';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function BottomNav() {
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  
  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/diet', label: 'Diet', icon: UtensilsCrossed },
    { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => window.location.href = item.path}
                className="flex flex-col items-center justify-center py-2 px-2 text-sm transition-colors"
              >
                <item.icon className="h-6 w-6 mb-1" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      {/* User Menu Modal */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowMenu(false)} />
      )}
    </>
  );
}

function FoodSearchPage() {
  const { mealType } = useParams<{ mealType: string }>();
  const navigate = useNavigate();
  
  if (!mealType) {
    return <Navigate to="/" replace />;
  }

  return (
    <FoodSearch
      mealType={mealType.charAt(0).toUpperCase() + mealType.slice(1)}
      onSelect={(food, unit) => {
        // TODO: Add item to meal
        navigate('/');
      }}
      onClose={() => navigate('/')}
    />
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><div>Settings - Coming Soon</div></ProtectedRoute>} />
        <Route path="/diet" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/add-food/:mealType" element={<ProtectedRoute><FoodSearchPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;