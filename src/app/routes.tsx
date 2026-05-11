import { createBrowserRouter } from 'react-router';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Landing,
  },
  {
    path: '/auth',
    Component: Auth,
  },
  {
    path: '/dashboard',
    Component: Dashboard,
  },
  {
    path: '/reset-password',
    Component: ResetPasswordPage,
  },
]);
