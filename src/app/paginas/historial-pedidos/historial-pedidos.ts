import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EstadoVisiblePedido, estadoVisiblePedido, Pedido } from '../../modelos/tienda';
import { TiendaService } from '../../servicios/tienda.service';

@Component({
  selector: 'app-historial-pedidos',
  imports: [CurrencyPipe, DatePipe, FormsModule, NgClass, RouterLink],
  templateUrl: './historial-pedidos.html',
})
export class HistorialPedidos implements OnInit {
  private readonly servicio = inject(TiendaService);
  private readonly pedidos = signal<Pedido[]>([]);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly estadoVisible = estadoVisiblePedido;
  protected readonly estado = signal<EstadoVisiblePedido | ''>('');
  protected readonly filtrados = computed(() => {
    const estado = this.estado();
    return this.pedidos().filter(
      (pedido) => !estado || this.estadoVisible(pedido.estado) === estado,
    );
  });

  async ngOnInit(): Promise<void> {
    try {
      this.pedidos.set(await this.servicio.listarPedidos());
    } catch {
      this.error.set('No se pudo cargar el historial.');
    } finally {
      this.cargando.set(false);
    }
  }
}
