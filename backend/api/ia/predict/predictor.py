from fastapi import APIRouter, Query
import xgboost as xgb
import pandas as pd
import google.genai as genai
import google.api_core.exceptions as google_exceptions
import json
import os
from time import time
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(encoding="utf-8")

router = APIRouter()

# Cliente de Gemini (Nuevo paquete google.genai)
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
GEMINI_MODEL = "gemini-3.1-flash-lite"

# Caché en memoria con TTL de 12 horas
CACHE_TTL = 12 * 3600
cache = {}

from fastapi import Depends
import sys
import os

# Asegurar que el directorio 'backend' esté en el path para importar auth y models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../")))
try:
    from auth import get_db
    from models import Venta
    from sqlalchemy.orm import Session
except ImportError:
    pass

@router.get("")
async def predecir_demanda(
    producto: str = Query(default="Todos", description="Nombre o ID del producto"),
    db: Session = Depends(get_db)
):
    try:
        # ---------------------------------------------------------
        # 1. CONSULTA A LA BASE DE DATOS (REEMPLAZO DE JSON ESTÁTICO)
        # ---------------------------------------------------------
        ventas = db.query(Venta).all()
        datos_procesados = []
        
        for venta in ventas:
            if not venta.items:
                continue
            try:
                # Puede ser un JSON válido o un texto en caso de inserción manual errónea
                items = json.loads(venta.items)
                if isinstance(items, list):
                    for item in items:
                        datos_procesados.append({
                            "producto_id": str(item.get("producto_id", "Desconocido")),
                            "nombre_producto": item.get("nombre_producto", "Desconocido"),
                            "cantidad": float(item.get("cantidad", 0)),
                            "fecha_venta": venta.fecha.date() if venta.fecha else datetime.now().date()
                        })
            except Exception as parse_error:
                print(f"Error parseando items de venta ID {venta.id}: {parse_error}")
                pass

        if not datos_procesados:
            # Fallback en caso de no tener datos en BD para evitar caídas
            print("⚠️ No hay ventas válidas en la BD, usando fallback para modelo.")
            datos_procesados = [
                {"producto_id": "1", "nombre_producto": "Fallback", "cantidad": 50, "fecha_venta": "2026-04-10"},
                {"producto_id": "1", "nombre_producto": "Fallback", "cantidad": 55, "fecha_venta": "2026-04-11"}
            ]

        # AQUÍ NACE 'df' OFICIALMENTE
        df = pd.DataFrame(datos_procesados)
        # Asegurar formato de fecha para agrupar
        df['fecha_venta'] = pd.to_datetime(df['fecha_venta']).dt.strftime('%Y-%m-%d')
        nombre_producto = "Todos los productos"
        
        # ---------------------------------------------------------
        # 2. FILTRAR LOS DATOS POR EL PRODUCTO Y AGRUPAR POR DÍA
        # ---------------------------------------------------------
        if producto != "Todos":
            print(f"Buscando el producto con ID o Nombre: {producto}")
            
            # Filtramos por producto_id o nombre_producto
            mask = (df['producto_id'].astype(str) == str(producto)) | (df['nombre_producto'].astype(str).str.lower() == str(producto).lower())
            df = df[mask]
            
            nombre_producto = producto
            
            # Validación de seguridad: si después de filtrar no hay datos
            if df.empty:
                print(f"⚠️ El filtro dejó el DataFrame vacío para el producto {producto}")
                return {
                    "producto": nombre_producto,
                    "recomendacion": f"No hay suficientes datos históricos para el producto {nombre_producto}.",
                    "nivel": "Pendiente",
                    "cantidad_estimada": 0,
                    "datosGrafica": {
                        "labels": [],
                        "datasets": []
                    }
                }

        # Agrupamos por fecha sumando las cantidades
        df_agrupado = df.groupby('fecha_venta')['cantidad'].sum().reset_index()
        df_agrupado = df_agrupado.sort_values('fecha_venta')

        fechas_historicas = df_agrupado['fecha_venta'].astype(str).tolist()
        cantidades_historicas = df_agrupado['cantidad'].tolist()
            
        # ---------------------------------------------------------
        # 3. MOTOR XGBOOST (Predicción Numérica Simulada/Real)
        # ---------------------------------------------------------
        # Simulando el resultado de XGBoost para los próximos 3 días
        fechas_futuras = ["2026-04-15", "2026-04-16", "2026-04-17"]
        
        # Lógica simulada: tomamos el último valor y lo proyectamos hacia arriba
        ultimo_valor = cantidades_historicas[-1] if cantidades_historicas else 50
        predicciones_xgboost = [int(ultimo_valor*1.1), int(ultimo_valor*1.2), int(ultimo_valor*1.3)] 
        
        # Tomamos el último valor predicho como la "Cantidad Estimada"
        cantidad_estimada_final = predicciones_xgboost[-1]
        
        # ---------------------------------------------------------
        # 4. CONSTRUCCIÓN DE EJES PARA CHART.JS (¡Muy Importante!)
        # ---------------------------------------------------------
        # Unimos el pasado y el futuro para que la gráfica sea una línea continua
        labels_grafica = fechas_historicas + fechas_futuras
        data_grafica = cantidades_historicas + predicciones_xgboost

        # ---------------------------------------------------------
        # 5. CACHÉ EN MEMORIA (TTL 12 HORAS)
        # ---------------------------------------------------------
        cache_key = producto.strip().lower()
        now = time()

        if cache_key in cache:
            ts, cached_response = cache[cache_key]
            if now - ts < CACHE_TTL:
                print(f"♻️ Respuesta desde caché para '{producto}'")
                return cached_response

        # ---------------------------------------------------------
        # 6. API DE GEMINI (Recomendación Estratégica)
        # ---------------------------------------------------------
        total_hist = sum(cantidades_historicas)
        avg_hist = total_hist / len(cantidades_historicas) if cantidades_historicas else 0

        prompt_gemini = (
            f"Producto: '{nombre_producto}'. "
            f"Ventas históricas: min={min(cantidades_historicas)}, "
            f"máx={max(cantidades_historicas)}, promedio={avg_hist:.1f}. "
            f"Proyección XGBoost próximos días: {predicciones_xgboost}. "
            f"¿Recomiendas comprar más stock? Máximo 2 líneas."
        )

        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt_gemini
            )
            texto_recomendacion = response.text
        except google_exceptions.ResourceExhausted:
            print("❌ Cuota de Gemini agotada (429/ResourceExhausted)")
            texto_recomendacion = "Análisis de IA en pausa por optimización de recursos. Basado en la gráfica, evalúe la tendencia para la producción."
        except google_exceptions.DeadlineExceeded:
            print("❌ Timeout de Gemini")
            texto_recomendacion = "El análisis de IA tardó demasiado. Use los datos de la gráfica para decidir."
        except Exception as gemini_error:
            print(f"❌ Error de Gemini: {gemini_error}")
            texto_recomendacion = "Recomendación IA no disponible temporalmente. Basado en la gráfica, evalúe la tendencia."

        # Definimos el nivel de alerta
        nivel_alerta = "Alto" if cantidad_estimada_final > 70 else "Normal"

        # ---------------------------------------------------------
        # 7. RETORNO DEL DICCIONARIO ESTRUCTURADO PARA REACT
        # ---------------------------------------------------------
        response_data = {
            "producto": nombre_producto,
            "recomendacion": texto_recomendacion,
            "nivel": nivel_alerta,
            "cantidad_estimada": cantidad_estimada_final,
            "datosGrafica": {
                "labels": labels_grafica,
                "datasets": [
                    {
                        "label": "Demanda Histórica y Proyectada",
                        "data": data_grafica,
                        "borderColor": "#3b82f6",
                        "backgroundColor": "rgba(59, 130, 246, 0.5)",
                        "tension": 0.3,
                        "fill": True
                    }
                ]
            }
        }

        cache[cache_key] = (time(), response_data)
        return response_data

    except Exception as e:
        # ---------------------------------------------------------
        # 7. BLINDAJE FINAL (Try-Catch General)
        # ---------------------------------------------------------
        print(f"❌ Error crítico en IA: {str(e)}")
        return {
            "producto": "Desconocido",
            "recomendacion": f"Error interno en el microservicio IA: {str(e)}.",
            "nivel": "Error",
            "cantidad_estimada": 0,
            "datosGrafica": {
                "labels": [],
                "datasets": []
            }
        }