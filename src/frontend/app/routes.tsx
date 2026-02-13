import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// Lazy load pages
const HomePage = lazy(() => import('../pages/home/HomePage'));
const PostDetailPage = lazy(() => import('../pages/post/PostDetailPage'));
const UserProfilePage = lazy(() => import('../pages/user/UserProfilePage'));
const UploadPage = lazy(() => import('../pages/upload/UploadPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <PageLayout />,
    children: [
      {
        path: '/',
        element: withSuspense(HomePage),
      },
      {
        path: '/post/:id',
        element: withSuspense(PostDetailPage),
      },
      {
        path: '/user/:id',
        element: withSuspense(UserProfilePage),
      },
      {
        path: '/upload',
        element: withSuspense(UploadPage),
      },
      {
        path: '/login',
        element: withSuspense(LoginPage),
      },
      {
        path: '/register',
        element: withSuspense(RegisterPage),
      },
    ],
  },
]);
