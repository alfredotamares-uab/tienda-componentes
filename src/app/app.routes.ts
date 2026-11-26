import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'productos', pathMatch: 'full' },
  {
    path: 'productos',
    loadComponent: () => import('./paginas/catalogo/catalogo').then((pagina) => pagina.Catalogo),
  },
  {
    path: 'nuevo-pedido',
    loadComponent: () =>
      import('./paginas/registro-pedido/registro-pedido').then((pagina) => pagina.RegistroPedido),
  },
  {
    path: 'pedidos',
    loadComponent: () =>
      import('./paginas/historial-pedidos/historial-pedidos').then(
        (pagina) => pagina.HistorialPedidos,
      ),
  },
  {
    path: 'pedidos/:id',
    loadComponent: () =>
      import('./paginas/detalle-pedido/detalle-pedido').then((pagina) => pagina.DetallePedido),
  },
  { path: '**', redirectTo: 'productos' },
];
