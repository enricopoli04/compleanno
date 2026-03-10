<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="hero">
      <div class="hero-text">
        <span class="tag">— Evento</span>
        <h1 class="hero-title">
          IL NOME<br />
          <span>DELL'EVENTO</span>
          <br />2025
        </h1>
        <p class="hero-desc">
          Inserisci qui la descrizione del tuo evento. Questa sezione è pensata per dare ai
          partecipanti tutte le informazioni necessarie: luogo, data, orario e dettagli
          sull'organizzazione.
        </p>
        <button class="btn" @click="router.push('/partecipazione')">
          Conferma partecipazione →
        </button>
      </div>
      <div class="hero-visual" data-text="EST.">EST.</div>
    </section>

    <!-- INFO STRIPS -->
    <section
      style="
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-bottom: var(--bordo);
      "
    >
      <div
        style="
          padding: 2.5rem 2rem;
          border-right: var(--bordo);
        "
      >
        <div
          style="
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 3.5rem;
            font-weight: 800;
            line-height: 1;
            color: var(--giallo);
            -webkit-text-stroke: 2px var(--nero);
          "
        >
          01
        </div>
        <div
          style="
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 700;
            margin: 0.4rem 0 0.8rem;
          "
        >
          Dove
        </div>
        <p style="font-size: 0.78rem; line-height: 1.7; color: #444">
          Inserisci il luogo dell'evento. Indirizzo, città, punto di riferimento.
        </p>
      </div>
      <div
        style="
          padding: 2.5rem 2rem;
          border-right: var(--bordo);
        "
      >
        <div
          style="
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 3.5rem;
            font-weight: 800;
            line-height: 1;
            color: var(--giallo);
            -webkit-text-stroke: 2px var(--nero);
          "
        >
          02
        </div>
        <div
          style="
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 700;
            margin: 0.4rem 0 0.8rem;
          "
        >
          Quando
        </div>
        <p style="font-size: 0.78rem; line-height: 1.7; color: #444">
          Data e orario dell'evento. Eventuali modifiche verranno comunicate qui.
        </p>
      </div>
      <div style="padding: 2.5rem 2rem">
        <div
          style="
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 3.5rem;
            font-weight: 800;
            line-height: 1;
            color: var(--giallo);
            -webkit-text-stroke: 2px var(--nero);
          "
        >
          03
        </div>
        <div
          style="
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 700;
            margin: 0.4rem 0 0.8rem;
          "
        >
          Cosa Portare
        </div>
        <p style="font-size: 0.78rem; line-height: 1.7; color: #444">
          Indicazioni su cosa portare, come vestirsi, o altri suggerimenti utili per i partecipanti.
        </p>
      </div>
    </section>
  </div>
</template>
