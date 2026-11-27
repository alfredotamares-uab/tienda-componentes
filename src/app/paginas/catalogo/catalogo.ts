import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductoTarjeta } from '../../componentes/producto-tarjeta/producto-tarjeta';
import { Producto } from '../../modelos/tienda';
import { TiendaService } from '../../servicios/tienda.service';

@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, ProductoTarjeta],
  templateUrl: './catalogo.html',
})
export class Catalogo implements OnInit {
  private readonly servicio = inject(TiendaService);
  private readonly router = inject(Router);
  private readonly productos = signal<Producto[]>([]);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly busqueda = signal('');
  protected readonly categoria = signal('');
  protected readonly categorias = computed(() => [
    ...new Set(this.productos().map((producto) => producto.categoria)),
  ]);
  protected readonly filtrados = computed(() => {
    const palabras = this.normalizar(this.busqueda()).split(/\s+/).filter(Boolean);
    const categoria = this.categoria();
    return this.productos().filter((producto) => {
      const datos = this.normalizar(`${producto.nombre} ${producto.categoria} ${producto.detalle}`);
      return (
        (!categoria || producto.categoria === categoria) &&
        palabras.every((palabra) => datos.includes(palabra))
      );
    });
  });

  async ngOnInit(): Promise<void> {
    try {
      this.productos.set(await this.servicio.listarProductos());
    } catch {
      this.error.set('No se pudo cargar el catálogo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected pedir(id: number): void {
    void this.router.navigate(['/nuevo-pedido'], { queryParams: { producto: id } });
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }
}
