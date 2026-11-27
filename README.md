# PCFORGE

Aplicación Angular para consultar componentes de computadora, registrar pedidos, marcarlos como pagados y eliminarlos del historial. El catálogo incluye tarjetas gráficas, procesadores, memoria, almacenamiento, placas madre y fuentes de poder. Los precios en bolivianos y las existencias son datos de ejemplo.

## Ejecutar el proyecto

Con Node.js 22.22.3 o superior de la rama 22, Node.js 24.15 o superior de la rama 24, o Node.js 26 o superior:

```powershell
npm.cmd ci
npm.cmd start
```

Abre [http://localhost:4202](http://localhost:4202).

## Cómo probar el flujo

1. En **Catálogo**, busca «RTX» y selecciona «Tarjetas gráficas». Elige **Añadir**.
2. Escribe el nombre del cliente, agrega un segundo componente y registra el pedido. Si la cantidad supera el stock, el formulario indica qué corregir. Con **Cancelar** puedes volver al catálogo antes de registrar el pedido.
3. En **Historial**, filtra por estado y abre el detalle. El pedido se conserva al recargar.
4. En el detalle, elige **Pagar pedido** y verifica el estado **Pagado** en el historial.
5. Elige **Eliminar pedido** y confirma el borrado. Vuelve al catálogo para comprobar que las unidades regresaron al stock.

IndexedDB guarda los componentes y los pedidos en el navegador. El registro descuenta las unidades y la eliminación las devuelve una vez. **Pagar pedido** guarda el estado **Pagado**.

## Imágenes del catálogo

El catálogo usa fotos de producto e imágenes ilustrativas. Se guardan en `public/productos` y la tarjeta elige el archivo según el ID del producto. Para cambiar una foto, reemplaza su archivo con otra imagen del mismo nombre. Para agregar una imagen a un producto nuevo, guarda el archivo en esa carpeta y registra su nombre junto al ID en `IMAGENES_PRODUCTO`, en `producto-tarjeta.ts`.
