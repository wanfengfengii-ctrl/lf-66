<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">多工况风箱性能分析平台</h1>
      <p class="app-subtitle">Multi-Condition Bellows Performance Analysis Platform</p>
    </header>

    <main class="app-main">
      <aside class="sidebar left-sidebar">
        <ControlPanel />
      </aside>

      <section class="main-content">
        <BellowsCanvas />
        <DataCharts />
      </section>

      <aside class="sidebar right-sidebar">
        <SchemeManager />
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import ControlPanel from '@/components/ControlPanel.vue'
import BellowsCanvas from '@/components/BellowsCanvas.vue'
import DataCharts from '@/components/DataCharts.vue'
import SchemeManager from '@/components/SchemeManager.vue'
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-header {
  padding: 20px 32px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.app-title {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.app-subtitle {
  font-size: 13px;
  color: #7f8c8d;
  font-weight: 400;
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 16px;
  padding: 16px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 1200px) {
  .app-main {
    grid-template-columns: 260px 1fr;
  }

  .right-sidebar {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .app-main {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: 2;
  }

  .main-content {
    order: 1;
  }

  .right-sidebar {
    order: 3;
  }
}

@media (max-width: 600px) {
  .app-header {
    padding: 16px;
  }

  .app-title {
    font-size: 18px;
  }

  .app-subtitle {
    font-size: 11px;
  }

  .app-main {
    padding: 12px;
    gap: 12px;
  }
}
</style>
