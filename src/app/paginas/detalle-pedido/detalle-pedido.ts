import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, from, of, switchMap } from 'rxjs';
import { Pedido } from '../../modelos/tienda';
import { ReglaPedidoError, TiendaService } from '../../servicios/tienda.service';

@Component({
  selector: 'app-detalle-pedido',
  imports: [CurrencyPipe, DatePipe, NgClass, RouterLink],
  templateUrl: './detalle-pedido.html',
})
export class DetallePedido {
  private readonly servicio = inject(TiendaService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly pedido = signal<Pedido | undefined>(undefined);
  protected readonly cargando = signal(true);
  protected readonly accion = signal<'cancelar' | 'eliminar' | null>(null);
  protected readonly errorCarga = signal('');
  protected readonly errorAccion = signal('');
  protected readonly mensaje = signal('');

  constructor() {
    this.ruta.paramMap
      .pipe(
        switchMap((parametros) => {
          this.cargando.set(true);
          this.errorCarga.set('');
          this.errorAccion.set('');
          this.mensaje.set('');

          const valor = parametros.get('id') ?? '';
          const id = Number(valor);
          if (!/^\d+$/.test(valor) || !Number.isSafeInteger(id) || id < 1) {
            return of(undefined);
          }
          return from(this.servicio.obtenerPedido(id)).pipe(
            catchError(() => {
              this.errorCarga.set('No se pudo cargar el pedido.');
              return of(undefined);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((pedido) => {
        this.pedido.set(pedido);
        this.cargando.set(false);
      });
  }

  protected async cancelar(pedido: Pedido): Promise<void> {
    if (this.accion() || pedido.estado !== 'Pendiente') return;

    this.accion.set('cancelar');
    this.errorAccion.set('');
    try {
      const cancelado = await this.servicio.cancelarPedido(pedido.id);
      if (this.pedido()?.id === cancelado.id) {
        this.pedido.set(cancelado);
        this.mensaje.set('Pedido anulado. Las unidades volvieron al catálogo.');
      }
    } catch (error) {
      if (this.pedido()?.id === pedido.id) {
        this.errorAccion.set(
          error instanceof ReglaPedidoError ? error.message : 'No se pudo anular el pedido.',
        );
      }
    } finally {
      this.accion.set(null);
    }
  }

  protected async eliminar(pedido: Pedido): Promise<void> {
    if (this.accion()) return;
    if (!window.confirm(`¿Eliminar definitivamente el pedido #${pedido.id} del historial?`)) return;

    const rutaActual = this.router.url;
    this.accion.set('eliminar');
    this.errorAccion.set('');
    try {
      await this.servicio.eliminarPedido(pedido.id);
      if (this.router.url === rutaActual) {
        await this.router.navigate(['/pedidos']);
      }
    } catch (error) {
      if (this.pedido()?.id === pedido.id) {
        this.errorAccion.set(
          error instanceof ReglaPedidoError ? error.message : 'No se pudo eliminar el pedido.',
        );
      }
    } finally {
      this.accion.set(null);
    }
  }
}
