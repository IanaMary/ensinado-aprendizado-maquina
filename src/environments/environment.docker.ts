export const environment = {
  production: true,
  // Servido pelo nginx do container, que faz proxy de /api/ -> backend:8000/
  apiUrl: '/api/'
};
