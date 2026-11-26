import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

  protected readonly pedido = signal<Pedido | undefined>(undefined);
  protected readonly cargando = signal(true);
  protected readonly cancelando = signal(false);
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
    if (this.cancelando() || pedido.estado !== 'Pendiente') return;

    this.cancelando.set(true);
    this.errorAccion.set('');
    try {
      const cancelado = await this.servicio.cancelarPedido(pedido.id);
      if (this.pedido()?.id === cancelado.id) {
        this.pedido.set(cancelado);
        this.mensaje.set('Pedido cancelado. Las unidades volvieron al catálogo.');
      }
    } catch (error) {
      if (this.pedido()?.id === pedido.id) {
        this.errorAccion.set(
          error instanceof ReglaPedidoError ? error.message : 'No se pudo cancelar el pedido.',
        );
      }
    } finally {
      this.cancelando.set(false);
    }
  }
}
