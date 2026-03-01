# be.energy

### Tu excedente solar es tuyo. Vendelo, compartilo, decidí qué hacer con él.

be.energy convierte el excedente solar en un activo digital transferible entre vecinos. La ley lo permite desde 2017. Nosotros lo hacemos posible.

---

## ¿Qué es be.energy en una oración?

Una red vecinal de energía donde el que tiene paneles solares puede venderle su excedente al vecino que no tiene — directamente, sin intermediarios, con la cooperativa como garante. O compartirlo en un fondo comunitario del barrio para que todos accedan.

---

## Lo primero que hay que entender

**La energía y los créditos son dos cosas separadas.**

La energía (electrones) viaja por cables físicos. Siempre. No viaja por internet, no viaja por blockchain, no viaja por Stellar. Los electrones van del panel solar → al cable → a la red eléctrica. Punto.

Lo que sí viaja por Stellar es el **registro del crédito**: quién generó cuánta energía, quién la compró, y cuánto pagó. Es como un recibo digital inmutable.

Pensalo así: cuando hacés una transferencia bancaria, los billetes físicos no viajan por internet. Lo que viaja es la información del movimiento de plata. Con be.energy pasa lo mismo: la energía va por la red eléctrica, el crédito va por Stellar.

---

## QUÉ PASA HOY (sin be.energy)

### La energía funciona, el crédito no

En Argentina, miles de familias instalaron paneles solares. Cuando les sobra energía, el excedente se inyecta a la red del barrio y la cooperativa les reconoce un crédito en la factura. Eso está bien.

Lo que no está bien es todo lo demás:

**El prosumidor no sabe cuánto genera.** En entrevistas nos dijeron: "no sé cuánto consumo, voy calculando medio al azar". El medidor tiene el dato exacto, pero nadie se lo muestra. La factura llega una vez por mes (o cada dos), con un número que no se entiende.

**No puede hacer nada con su crédito.** Si le sobra energía, el crédito queda ahí, acumulándose en la factura. No puede vendérselo al vecino que sí lo necesita. No puede ponerlo en un fondo comunitario. No puede decidir nada.

**La ley dice que sí puede.** El Art. 12f de la Ley 27.424 (2017) habilita la transferencia de créditos entre usuarios del mismo distribuidor. Pero en 8 años, nadie construyó la herramienta para que eso pase.

**Resultado:** familias que invirtieron USD 3.000-8.000 en paneles generan valor para el barrio y no reciben a cambio ni visibilidad, ni control, ni la posibilidad de compartir lo que producen.

be.energy existe para cambiar eso.

---

## CÓMO FUNCIONA

### La capa física (los electrones — esto ya existe)

**Paso 1 → El sol pega en los paneles.** Una familia tiene paneles solares en el techo. El sol genera corriente continua (CC).

**Paso 2 → El inversor convierte la energía.** Un inversor ON GRID convierte esa corriente en 220V alterna — la misma que sale del enchufe. Si la familia consume más de lo que genera, toma el resto de la red. Si genera más de lo que consume, el excedente sale automáticamente a la red del barrio.

**Paso 3 → El medidor cuenta todo.** El medidor bidireccional (obligatorio por ley) registra con precisión cuántos kWh entran a la casa y cuántos salen. Ese dato existe. Es exacto. La cooperativa lo lee periódicamente.

**Paso 4 → El excedente lo usa el vecino más cercano.** La energía inyectada entra a la red de baja tensión y la consume quien esté demandando en ese momento. Es física: el electrón va al punto de menor resistencia. El vecino ni se entera de que está usando energía del panel de al lado.

```
Sol → Panel → Inversor → Casa (autoconsumo)
                           ↓ (si sobra)
                       Red del barrio → Vecinos la consumen
                           ↓
                     Medidor registra kWh inyectados
```

**Todo esto ya funciona.** be.energy no toca esta capa. No instalamos paneles, no manejamos la red, no ponemos medidores. Lo que hacemos es lo que viene después.

---

### La capa digital (los créditos — acá entra be.energy)

**Paso 5 → El dato de inyección llega a be.energy**

El medidor ya midió cuántos kWh inyectó la familia. Ese dato tiene que llegar a nuestra plataforma. Cómo llega depende de la etapa:

**Hoy (piloto):** La cooperativa ya tiene el dato porque lee el medidor por ley. Lo carga en be.energy manualmente o por CSV. Simple, sin hardware nuevo, arrancamos mañana. Limitación: es mensual y depende de que el admin lo haga.

**Mañana (producto real):** Un sensor LoRa barato (~USD 15-30) se coloca en el medidor existente. Lee los pulsos y transmite cada 15 minutos a un gateway en la cooperativa (~USD 100-200, cubre varios km). El dato llega automático a nuestra API. Sin WiFi, sin datos móviles, sin intervención humana. **Ahora el prosumidor abre el celular y ve en tiempo real cuánto está generando.** Esto resuelve el "calculo al azar".

**Después (escala):** Con datos históricos, sumamos predicción (cuánto vas a generar mañana según el clima), optimización (cuándo conviene vender), y alertas (tu panel está rindiendo menos de lo esperado). La inteligencia no mide kWh — el sensor lo hace. La inteligencia interpreta y optimiza.

**Paso 6 → be.energy emite el crédito digital**

Contra el dato validado, el smart contract en Soroban emite HDROP a la wallet de la familia:

```
1 HDROP = 1 kWh de crédito de inyección verificado
```

¿Quién autoriza? La cooperativa. Es la autoridad de medición reconocida por ley. En el piloto, el admin aprueba manualmente. Con el sensor, se auto-aprueba si el dato está dentro de parámetros normales. La cooperativa siempre mantiene control.

**Paso 7 → El prosumidor decide qué hacer con su energía**

Por primera vez, tiene opciones:

**Vender a un vecino.** Lista sus HDROP en el mercado vecinal: "Vendo 100 kWh a $50 cada uno". El vecino acepta. Swap atómico en Stellar: créditos y pago se intercambian en un solo paso, ~5 segundos, costo prácticamente cero. Sin intermediarios.

**Compartir con el barrio.** Deposita sus HDROP en el **fondo comunitario de energía** del barrio. Esto funciona con DeFindex, un protocolo de Stellar que crea "vaults" (bóvedas comunitarias). Pensalo como una alcancía del barrio: cada prosumidor pone créditos, y el fondo los reparte proporcionalmente entre los vecinos que participan. Una familia que genera mucho en verano puede aportar al fondo; un vecino sin paneles puede participar del fondo y recibir créditos a mejor precio que la tarifa plena. La cooperativa administra el fondo, DeFindex garantiza que la distribución sea transparente y automática — nadie puede tocar los créditos que no le corresponden.

**Guardarlo.** Los HDROP quedan en su wallet. El crédito sigue existiendo en la factura como siempre. be.energy no reemplaza nada — agrega opciones.

**Paso 8 → El vecino usa el crédito**

El vecino que compró 100 HDROP los presenta. La cooperativa los reconoce como créditos transferidos bajo Art. 12f. Si consumió 400 kWh, le facturan solo 300. Accedió a energía solar local sin instalar un solo panel.

**Paso 9 → Todo queda registrado**

Cada emisión, venta, transferencia y redención queda en Stellar. Cualquier socio de la cooperativa puede verificar: cuánto se generó, quién lo tiene, a qué precio se vendió, cuándo se usó. Se acabó el Excel opaco.

---

## EL DIAGRAMA

```
☀️ SOL
 │
 ▼
┌─────────────┐
│ PANEL SOLAR │
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  INVERSOR    │
│  CC → CA     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│         CASA                  │
│  Consumo < generación → sobra │
│  Excedente sale a la red      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   MEDIDOR BIDIRECCIONAL      │
│   kWh entrada / kWh salida   │
└──────────────┬───────────────┘
               │
═══════════════╪═══════════════════════════
  CAPA FÍSICA ↑  (ya funciona sin nosotros)
  CAPA DIGITAL ↓ (acá entra be.energy)
═══════════════╪═══════════════════════════
               │
    ┌──────────┴──────────────────────┐
    │                                  │
    ▼ HOY (piloto)                     ▼ MAÑANA (producto real)
┌──────────────────┐           ┌────────────────────┐
│ Cooperativa      │           │ Sensor LoRa        │
│ carga dato       │           │ dato cada 15 min   │
│ manual / CSV     │           │ automático         │
└────────┬─────────┘           └─────────┬──────────┘
         │                               │
         │                        ┌──────▼──────┐
         │                        │ Gateway LoRa│
         │                        └──────┬──────┘
         │                               │
         ▼                               ▼
┌──────────────────────────────────────────────┐
│              API be.energy                    │
│    Recibe dato → Valida → Dispara mint       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          SOROBAN: Mint HDROP                  │
│         1 HDROP = 1 kWh verificado            │
└──────────────────────┬───────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌───────────┐ ┌──────────┐ ┌──────────┐
   │  VENDER   │ │ COMPARTIR│ │ GUARDAR  │
   │  a vecino │ │ en fondo │ │          │
   │  (mercado │ │ comunita-│ │          │
   │  vecinal) │ │ rio      │ │          │
   │           │ │(DeFindex)│ │          │
   └─────┬─────┘ └────┬─────┘ └──────────┘
         │            │
         ▼            ▼
┌──────────────────────────────────────────────┐
│          FACTURA COOPERATIVA                  │
│  Vecino: 400 kWh - 100 HDROP = 300 facturados│
└──────────────────────────────────────────────┘

                 DESPUÉS (escala)
                       │
              ┌────────▼────────┐
              │  INTELIGENCIA   │
              │  Predicción     │
              │  Optimización   │
              │  Alertas        │
              └─────────────────┘
```

---

## PREGUNTAS FRECUENTES

**¿Necesito hardware especial para participar?**
Para el piloto, no. Para el producto real, un sensor LoRa (~USD 15-30) en el medidor + un gateway (~USD 100-200) en la cooperativa. Y un celular.

**¿La energía se reparte por blockchain?**
No. La energía va por cables, siempre. Blockchain reparte los **créditos**: el derecho económico sobre esa energía. Son dos capas independientes.

**¿El vecino que compra HDROP recibe los electrones del prosumidor?**
No necesariamente. Recibe el crédito económico. La energía física va a cualquier punto de la red. Pero el crédito es verificable y se aplica en factura. Igual que un bono de carbono no te manda aire limpio a tu casa — te da el crédito.

**¿Dónde entra la inteligencia artificial?**
En la tercera etapa. Predice generación, optimiza cuándo vender, detecta anomalías. Pero para medir kWh no se necesita — el sensor lo hace con precisión.

**¿El prosumidor que "calcula al azar" cuánto genera?**
Ese es exactamente el dolor que resolvemos. Hoy el dato está encerrado en el medidor y la factura llega tarde. Con be.energy, lo ve desde el celular — en tiempo real con el sensor, o con desglose mensual en el piloto.

**¿Y si la cooperativa no quiere cargar datos?**
Por eso el sensor LoRa es el producto real. En el piloto dependemos de la cooperativa, pero la evolución natural es automatizar la captura. El dato llega solo.

**¿Energética Sur es parte de be.energy?**
No. Venden hardware (paneles, inversores, baterías). Son posible partner comercial: ellos venden el fierro, nosotros la capa digital. Pero no son parte del stack técnico.

---

## QUÉ TOCA be.energy Y QUÉ NO

| Componente | ¿Qué hace? | ¿be.energy? |
|---|---|---|
| Panel solar | Genera electricidad | No |
| Inversor | Convierte CC→CA, inyecta excedente | No |
| Medidor bidireccional | Cuenta kWh entrada/salida | No (lee el dato) |
| Red eléctrica | Transporta electrones | No |
| Sensor LoRa | Lee medidor cada 15 min automático | Fase 2 |
| Gateway LoRa | Recibe datos, envía a API | Fase 2 |
| API + Dashboard | Visibilidad para prosumidor y cooperativa | Si |
| Smart contract Soroban | Emite HDROP contra lectura validada | Si |
| Mercado vecinal | Venta de créditos entre vecinos | Si |
| Fondo comunitario (DeFindex) | Bóveda de energía solar del barrio | Si |
| Wallet | El prosumidor gestiona sus créditos | Si |
| Capa de inteligencia | Predicción, optimización, alertas | Fase 3 |

---

## EN UNA IMAGEN

**Sin be.energy:** Generás energía solar → la cooperativa te da un número en la factura → no podés hacer nada con él → tu vecino no puede acceder.

**Con be.energy:** Generás energía solar → ves en tu celular cuánto generaste → lo convertís en un crédito digital → se lo vendés a tu vecino en el mercado vecinal o lo depositás en el fondo comunitario del barrio → la cooperativa lo reconoce en factura → todo queda registrado.

---

be.energy no cambia cómo fluye la electricidad.
Cambia quién decide qué hacer con su valor.

Cada familia con paneles deja de ser un número en la factura de la cooperativa y se convierte en un nodo activo de una red energética local. Puede vender. Puede compartir. Puede decidir. Eso no existía. Ahora sí.
