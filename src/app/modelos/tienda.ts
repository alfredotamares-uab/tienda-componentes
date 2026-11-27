export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  detalle: string;
  precio: number;
  existencias: number;
}

export interface SeleccionProducto {
  productoId: number;
  cantidad: number;
}

export interface LineaPedido extends SeleccionProducto {
  nombre: string;
  precio: number;
}

export type EstadoPedido = 'Pendiente' | 'Pagado';

export interface Pedido {
  id: number;
  cliente: string;
  fecha: string;
  estado: EstadoPedido;
  existenciasDevueltas?: true;
  lineas: LineaPedido[];
  total: number;
}
