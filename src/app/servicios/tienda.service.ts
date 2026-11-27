import { Injectable } from '@angular/core';
import { LineaPedido, Pedido, Producto, SeleccionProducto } from '../modelos/tienda';

const PRODUCTOS_INICIALES: Producto[] = [
  {
    id: 1,
    nombre: 'GeForce RTX 4060',
    categoria: 'Tarjetas gráficas',
    detalle: 'NVIDIA · 8 GB GDDR6',
    precio: 5700,
    existencias: 6,
  },
  {
    id: 2,
    nombre: 'Radeon RX 7600',
    categoria: 'Tarjetas gráficas',
    detalle: 'AMD · 8 GB GDDR6',
    precio: 4980,
    existencias: 4,
  },
  {
    id: 3,
    nombre: 'Ryzen 5 5600',
    categoria: 'Procesadores',
    detalle: 'AMD · Socket AM4',
    precio: 2180,
    existencias: 10,
  },
  {
    id: 4,
    nombre: 'Core i5-12400F',
    categoria: 'Procesadores',
    detalle: 'Intel · Socket LGA1700',
    precio: 2780,
    existencias: 7,
  },
  {
    id: 5,
    nombre: 'Kingston FURY Beast DDR4 RGB',
    categoria: 'Memoria RAM',
    detalle: '16 GB · 3200 MT/s · LED RGB',
    precio: 640,
    existencias: 12,
  },
  {
    id: 6,
    nombre: 'SSD Kingston NV3',
    categoria: 'Almacenamiento',
    detalle: '1 TB · M.2 2280 · PCIe 4.0 NVMe',
    precio: 980,
    existencias: 9,
  },
  {
    id: 7,
    nombre: 'Placa madre B550',
    categoria: 'Placas madre',
    detalle: 'Socket AM4 · Memoria DDR4',
    precio: 1940,
    existencias: 5,
  },
  {
    id: 8,
    nombre: 'DeepCool DN650',
    categoria: 'Fuentes de poder',
    detalle: '650 W · ATX · 80 PLUS 230V EU',
    precio: 1080,
    existencias: 8,
  },
  {
    id: 9,
    nombre: 'SSD Samsung 990 EVO Plus',
    categoria: 'Almacenamiento',
    detalle: '1 TB · M.2 2280 · PCIe 4.0 NVMe',
    precio: 1580,
    existencias: 6,
  },
  {
    id: 10,
    nombre: 'Corsair CX650',
    categoria: 'Fuentes de poder',
    detalle: '650 W · ATX · 80 PLUS Bronze',
    precio: 1300,
    existencias: 5,
  },
];

export class ReglaPedidoError extends Error {}

@Injectable({ providedIn: 'root' })
export class TiendaService {
  private conexion?: Promise<IDBDatabase>;

  async listarProductos(): Promise<Producto[]> {
    return this.transaccion(['productos'], 'readonly', (tx) =>
      this.solicitud<Producto[]>(tx.objectStore('productos').getAll()),
    );
  }

  async listarPedidos(): Promise<Pedido[]> {
    const pedidos = await this.transaccion(['pedidos'], 'readonly', (tx) =>
      this.solicitud<Pedido[]>(tx.objectStore('pedidos').getAll()),
    );
    return pedidos.reverse();
  }

  async obtenerPedido(id: number): Promise<Pedido | undefined> {
    return this.transaccion(['pedidos'], 'readonly', (tx) =>
      this.solicitud<Pedido | undefined>(tx.objectStore('pedidos').get(id)),
    );
  }

  async registrarPedido(cliente: string, seleccion: SeleccionProducto[]): Promise<number> {
    const nombreCliente = cliente.trim();
    if (!nombreCliente || nombreCliente.length > 100) {
      throw new ReglaPedidoError('Ingresa un nombre de cliente de hasta 100 caracteres.');
    }
    if (seleccion.length === 0) {
      throw new ReglaPedidoError('Agrega al menos un producto al pedido.');
    }
    if (new Set(seleccion.map((linea) => linea.productoId)).size !== seleccion.length) {
      throw new ReglaPedidoError('Cada producto debe aparecer una sola vez. Ajusta su cantidad.');
    }

    return this.transaccion(['productos', 'pedidos'], 'readwrite', async (tx) => {
      const productos = tx.objectStore('productos');
      const lineas: LineaPedido[] = [];
      let totalCentavos = 0;

      for (const { productoId, cantidad } of seleccion) {
        const producto = await this.descontarExistencias(productos, productoId, cantidad);

        lineas.push({ productoId, cantidad, nombre: producto.nombre, precio: producto.precio });
        totalCentavos += Math.round(producto.precio * 100) * cantidad;
      }

      const pedido: Omit<Pedido, 'id'> = {
        cliente: nombreCliente,
        fecha: new Date().toISOString(),
        estado: 'Pendiente',
        lineas,
        total: totalCentavos / 100,
      };
      const id = await this.solicitud(tx.objectStore('pedidos').add(pedido));
      return Number(id);
    });
  }

  async pagarPedido(id: number): Promise<Pedido> {
    return this.transaccion(['productos', 'pedidos'], 'readwrite', async (tx) => {
      const pedidos = tx.objectStore('pedidos');
      const pedido = await this.solicitud<Pedido | undefined>(pedidos.get(id));
      if (!pedido) {
        throw new ReglaPedidoError('El pedido no existe.');
      }
      if (pedido.estado === 'Pagado') {
        throw new ReglaPedidoError('El pedido ya está pagado.');
      }

      if (pedido.estado === 'Cancelado') {
        const productos = tx.objectStore('productos');
        for (const { productoId, cantidad } of pedido.lineas) {
          await this.descontarExistencias(productos, productoId, cantidad);
        }
      }

      const pagado: Pedido = { ...pedido, estado: 'Pagado' };
      await this.solicitud(pedidos.put(pagado));
      return pagado;
    });
  }

  async eliminarPedido(id: number): Promise<void> {
    return this.transaccion(['productos', 'pedidos'], 'readwrite', async (tx) => {
      const pedidos = tx.objectStore('pedidos');
      const pedido = await this.solicitud<Pedido | undefined>(pedidos.get(id));
      if (!pedido) {
        throw new ReglaPedidoError('El pedido no existe.');
      }

      if (pedido.estado !== 'Cancelado') {
        await this.devolverExistencias(tx.objectStore('productos'), pedido.lineas);
      }

      await this.solicitud(pedidos.delete(id));
    });
  }

  private async descontarExistencias(
    productos: IDBObjectStore,
    productoId: number,
    cantidad: number,
  ): Promise<Producto> {
    if (!Number.isSafeInteger(cantidad) || cantidad < 1) {
      throw new ReglaPedidoError('Ingresa una cantidad entera mayor o igual a 1.');
    }

    const producto = await this.solicitud<Producto | undefined>(productos.get(productoId));
    if (!producto) {
      throw new ReglaPedidoError('Selecciona un producto del catálogo.');
    }
    if (cantidad > producto.existencias) {
      throw new ReglaPedidoError(
        `Quedan ${producto.existencias} unidades de ${producto.nombre} y el pedido requiere ${cantidad}.`,
      );
    }

    await this.solicitud(
      productos.put({ ...producto, existencias: producto.existencias - cantidad }),
    );
    return producto;
  }

  private async devolverExistencias(
    productos: IDBObjectStore,
    lineas: LineaPedido[],
  ): Promise<void> {
    for (const { productoId, cantidad, nombre } of lineas) {
      const producto = await this.solicitud<Producto | undefined>(productos.get(productoId));
      if (!producto) {
        throw new ReglaPedidoError(`No se encontraron las existencias de ${nombre}.`);
      }
      await this.solicitud(
        productos.put({ ...producto, existencias: producto.existencias + cantidad }),
      );
    }
  }

  private abrir(): Promise<IDBDatabase> {
    this.conexion ??= new Promise<IDBDatabase>((resolve, reject) => {
      const apertura = indexedDB.open('tienda-componentes', 4);

      apertura.onupgradeneeded = ({ oldVersion }) => {
        if (oldVersion === 0) {
          const db = apertura.result;
          const productos = db.createObjectStore('productos', { keyPath: 'id' });
          db.createObjectStore('pedidos', { keyPath: 'id', autoIncrement: true });
          for (const producto of PRODUCTOS_INICIALES) {
            productos.add(producto);
          }
          return;
        }

        // Los pedidos pagados usan los mismos almacenes. Solo se migran precios desde versiones anteriores a la 3.
        if (oldVersion >= 3) return;

        // Las bases de la versión 1 también reciben los nombres y productos agregados en la versión 2.
        const cambiosV2 =
          oldVersion === 1
            ? PRODUCTOS_INICIALES.filter(({ id }) => [5, 6, 8, 9, 10].includes(id))
            : [];
        const pendientes = new Map(cambiosV2.map((producto) => [producto.id, producto]));
        const productos = apertura.transaction!.objectStore('productos');
        const consulta: IDBRequest<Producto[]> = productos.getAll();
        consulta.onsuccess = () => {
          for (const guardado of consulta.result) {
            const cambio = pendientes.get(guardado.id);
            pendientes.delete(guardado.id);
            productos.put({
              ...guardado,
              nombre: cambio?.nombre ?? guardado.nombre,
              detalle: cambio?.detalle ?? guardado.detalle,
              precio: guardado.precio * 2,
            });
          }

          for (const producto of pendientes.values()) {
            productos.add(producto);
          }
        };
      };

      apertura.onsuccess = () => {
        const db = apertura.result;
        db.onversionchange = () => {
          db.close();
          this.conexion = undefined;
        };
        db.onclose = () => {
          this.conexion = undefined;
        };
        resolve(db);
      };
      apertura.onerror = () => reject(apertura.error);
    }).catch((error) => {
      this.conexion = undefined;
      throw error;
    });
    return this.conexion;
  }

  private solicitud<T>(solicitud: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => reject(solicitud.error);
    });
  }

  private async transaccion<T>(
    almacenes: string[],
    modo: IDBTransactionMode,
    operacion: (tx: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    const db = await this.abrir();
    const tx = db.transaction(almacenes, modo);
    const fin = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error('La transacción fue cancelada.'));
    });

    try {
      const [resultado] = await Promise.all([operacion(tx), fin]);
      return resultado;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // IndexedDB puede haber abortado ya la transacción por un error de escritura.
      }
      await fin.catch(() => undefined);
      throw error;
    }
  }
}
