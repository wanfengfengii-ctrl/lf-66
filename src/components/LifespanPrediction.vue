<template>
  <div class="lifespan-container">
    <div v-if="lifespanEvaluation.hasHighRisk" class="high-risk-banner danger">
      <span class="banner-icon">🚨</span>
      <span class="banner-text">
        <strong>紧急风险：</strong>{{ lifespanEvaluation.highRiskComponents.join('、') }} 剩余寿命不足15%，建议立即停机更换！
      </span>
    </div>
    <div v-else-if="lifespanEvaluation.hasWarning" class="high-risk-banner warning">
      <span class="banner-icon">⚠️</span>
      <span class="banner-text">
        <strong>维护提醒：</strong>{{ lifespanEvaluation.warningComponents.join('、') }} 已进入预警区间(剩余寿命15%-30%)，请安排近期维护。
      </span>
    </div>

    <div class="lifespan-subtabs">
      <button
        v-for="tab in lifespanSubtabs"
        :key="tab.key"
        @click="activeSubtab = tab.key"
        :class="['lifespan-subtab', { active: activeSubtab === tab.key }]"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <div v-show="activeSubtab === 'overview'" class="lifespan-overview">
      <div class="health-score-section">
        <div class="overall-health-card" :class="getHealthClass(lifespanEvaluation.overallHealthScore)">
          <div class="health-header">
            <span class="health-title">系统整体健康度</span>
            <span class="health-badge">{{ getHealthLabel(lifespanEvaluation.overallHealthScore) }}</span>
          </div>
          <div class="health-score-display">
            <div ref="healthGaugeRef" class="health-gauge"></div>
          </div>
          <div class="health-info-row">
            <div class="info-item">
              <span class="info-label">建议维护周期</span>
              <span class="info-value">
                {{ formatHours(lifespanEvaluation.estimatedMaintenanceCycleHours) }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">高风险部件</span>
              <span :class="['info-value', 'danger']" v-if="lifespanEvaluation.hasHighRisk">
                {{ lifespanEvaluation.highRiskComponents.length }} 个
              </span>
              <span class="info-value success" v-else>无</span>
            </div>
          </div>
        </div>

        <div class="component-health-grid">
          <div
            v-for="comp in lifespanEvaluation.components"
            :key="comp.componentKey"
            class="component-health-card"
            :class="`risk-${comp.riskLevel}`"
          >
            <div class="comp-header">
              <span class="comp-icon">{{ getComponentIcon(comp.componentKey) }}</span>
              <span class="comp-name">{{ comp.componentName }}</span>
              <span :class="['comp-risk-badge', comp.riskLevel]">
                {{ getRiskLabel(comp.riskLevel) }}
              </span>
            </div>
            <div class="comp-health-bar">
              <div
                class="health-fill"
                :style="{ width: `${comp.healthScore}%` }"
                :class="getHealthBarClass(comp.healthScore)"
              ></div>
              <span class="health-percent">{{ comp.healthScore }}%</span>
            </div>
            <div class="comp-stats">
              <div class="comp-stat">
                <span class="stat-label">剩余寿命</span>
                <span class="stat-value">{{ formatHours(comp.remainingLifespanHours) }}</span>
              </div>
              <div class="comp-stat">
                <span class="stat-label">基准寿命</span>
                <span class="stat-value">{{ formatHours(comp.baseLifespanHours) }}</span>
              </div>
              <div class="comp-stat">
                <span class="stat-label">磨损速率</span>
                <span class="stat-value">{{ comp.wearRate.toFixed(4) }}‰/h</span>
              </div>
            </div>
            <div class="comp-warn-threshold">
              <span v-if="comp.riskLevel !== 'normal'" class="threshold-warn">
                ⚠ 预警阈值：{{ formatHours(comp.thresholdHours) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="wear-factors-card">
        <h4 class="section-heading">🔍 磨损影响因子分析</h4>
        <div class="factors-grid">
          <div class="factor-item">
            <span class="factor-name">拉杆频率</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.frequencyFactor - 1) * 50)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.frequencyFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.frequencyFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">阀片卡滞</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.valveStuckFactor - 1) * 30)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.valveStuckFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.valveStuckFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">负载压力</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.loadPressureFactor - 1) * 50)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.loadPressureFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.loadPressureFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">环境阻力</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.resistanceFactor - 1) * 70)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.resistanceFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.resistanceFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">漏气率</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.leakageFactor - 1) * 40)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.leakageFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.leakageFactor.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeSubtab === 'trend'" class="lifespan-trend-view">
      <div class="chart-item full-width">
        <div ref="lifespanTrendChartRef" class="chart tall"></div>
        <p class="chart-label">部件寿命衰减趋势预测（运行小时 vs 健康度）</p>
      </div>

      <div class="chart-item full-width">
        <div ref="componentLifespanBarRef" class="chart tall"></div>
        <p class="chart-label">各部件剩余寿命对比（小时）</p>
      </div>
    </div>

    <div v-show="activeSubtab === 'alerts'" class="lifespan-alerts-view">
      <div class="alerts-section">
        <h4 class="section-heading">
          <span>⚠️ 维护预警列表</span>
          <span class="alert-count-badge">{{ lifespanEvaluation.maintenanceAlerts.length }}</span>
        </h4>
        <div v-if="lifespanEvaluation.maintenanceAlerts.length === 0" class="empty-alerts">
          <div class="empty-icon">✅</div>
          <p>所有部件状态良好，暂无维护预警</p>
          <p class="empty-tip">继续保持良好的运行工况</p>
        </div>
        <div v-else class="alerts-list">
          <div
            v-for="alert in lifespanEvaluation.maintenanceAlerts"
            :key="alert.id"
            :class="['alert-item', alert.level]"
          >
            <div class="alert-header">
              <span class="alert-icon">{{ getAlertIcon(alert.level) }}</span>
              <span class="alert-title">{{ alert.title }}</span>
              <span :class="['alert-level-badge', alert.level]">
                {{ getAlertLevelLabel(alert.level) }}
              </span>
            </div>
            <p class="alert-message">{{ alert.message }}</p>
            <div class="alert-footer">
              <span class="alert-remaining">
                ⏱ 剩余寿命：<strong>{{ formatHours(alert.remainingHours) }}</strong>
              </span>
              <span class="alert-action">
                🔧 建议：<strong>{{ alert.recommendedAction }}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="suggestions-section">
        <h4 class="section-heading">📋 维护建议清单</h4>
        <div class="suggestions-list">
          <div
            v-for="(suggestion, index) in lifespanEvaluation.suggestions"
            :key="index"
            :class="['suggestion-item', `urgency-${suggestion.urgency}`]"
          >
            <div class="suggestion-header">
              <span :class="['urgency-badge', suggestion.urgency]">
                {{ getUrgencyLabel(suggestion.urgency) }}
              </span>
              <span class="suggestion-component">{{ suggestion.component }}</span>
            </div>
            <div class="suggestion-body">
              <div class="suggestion-row">
                <span class="suggestion-label">维护措施：</span>
                <span class="suggestion-value action">{{ suggestion.action }}</span>
              </div>
              <div class="suggestion-row">
                <span class="suggestion-label">计划时间：</span>
                <span class="suggestion-value schedule">{{ suggestion.schedule }}</span>
              </div>
              <div class="suggestion-row">
                <span class="suggestion-label">预估费用：</span>
                <span class="suggestion-value cost">{{ suggestion.estimatedCost }}</span>
              </div>
              <div class="suggestion-row reason-row">
                <span class="suggestion-label">原因分析：</span>
                <span class="suggestion-value reason">{{ suggestion.reason }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeSubtab === 'comparison'" class="lifespan-comparison-view">
      <div v-if="selectedSchemes.length < 2" class="empty-compare">
        <div class="empty-compare-icon">📊</div>
        <p>请在右侧"方案管理"中选择至少2个已保存方案进行对比</p>
        <p class="empty-compare-tip">勾选方案列表中的复选框即可添加到对比视图</p>
      </div>
      <div v-else class="comparison-content">
        <div class="compare-hint">
          <span class="hint-icon">ℹ️</span>
          <span class="hint-text">提示：升级前保存的旧方案将按其保存参数自动计算寿命数据，用于对比参考。</span>
        </div>
        
        <div class="comparison-subtabs">
          <button
            v-for="subtab in comparisonSubtabs"
            :key="subtab.key"
            @click="comparisonSubtab = subtab.key"
            :class="['comparison-subtab', { active: comparisonSubtab === subtab.key }]"
          >
            {{ subtab.label }}
          </button>
        </div>

        <div v-show="comparisonSubtab === 'lifespan'" class="comparison-lifespan">
          <div class="chart-item full-width">
            <div ref="compareHealthRadarRef" class="chart tall"></div>
            <p class="chart-label">多方案部件健康度对比（雷达图）</p>
          </div>

          <div class="chart-item full-width">
            <div ref="compareLifespanBarRef" class="chart tall"></div>
            <p class="chart-label">多方案部件剩余寿命对比（小时）</p>
          </div>

          <div class="comparison-table-card">
            <h4 class="section-heading">📋 寿命对比表</h4>
            <div class="comparison-table-wrapper">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>方案名称</th>
                    <th>整体健康度</th>
                    <th>阀片寿命</th>
                    <th>密封件寿命</th>
                    <th>活塞寿命</th>
                    <th>维护周期</th>
                    <th>风险状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(scheme, idx) in computedForComparison" :key="scheme.id">
                    <td :class="['scheme-name-cell']">
                      <span class="color-dot" :style="{ background: comparisonColors[idx % comparisonColors.length] }"></span>
                      {{ scheme.name }}
                    </td>
                    <td :class="getHealthTableClass(scheme.lifespanEvaluation.overallHealthScore)">
                      {{ scheme.lifespanEvaluation.overallHealthScore.toFixed(1) }}%
                    </td>
                    <td>{{ formatHours(scheme.lifespanEvaluation.components[0].remainingLifespanHours) }}</td>
                    <td>{{ formatHours(scheme.lifespanEvaluation.components[1].remainingLifespanHours) }}</td>
                    <td>{{ formatHours(scheme.lifespanEvaluation.components[2].remainingLifespanHours) }}</td>
                    <td>{{ formatHours(scheme.lifespanEvaluation.estimatedMaintenanceCycleHours) }}</td>
                    <td>
                      <span v-if="scheme.lifespanEvaluation.hasHighRisk" class="high-risk-tag">
                        🚨 紧急 {{ scheme.lifespanEvaluation.highRiskComponents.length }}个
                      </span>
                      <span v-else-if="scheme.lifespanEvaluation.hasWarning" class="warning-tag">
                        ⚠️ 预警 {{ scheme.lifespanEvaluation.warningComponents.length }}个
                      </span>
                      <span v-else class="no-risk-tag">✅ 正常</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-show="comparisonSubtab === 'maintenance'" class="comparison-maintenance">
          <div v-if="schemesMaintenanceComparison.filter(c => c.maintenanceCount > 0).length < 2" class="empty-compare small">
            <div class="empty-compare-icon">📝</div>
            <p>所选方案中维护记录不足，无法进行维护对比</p>
            <p class="empty-compare-tip">请为方案添加维护记录后再进行对比</p>
          </div>
          <div v-else>
            <div class="chart-item full-width">
              <div ref="maintenanceCompareChartRef" class="chart tall"></div>
              <p class="chart-label">多方案维护指标对比</p>
            </div>

            <div class="comparison-table-card">
              <h4 class="section-heading">💰 维护成本对比</h4>
              <div class="comparison-table-wrapper">
                <table class="comparison-table">
                  <thead>
                    <tr>
                      <th>方案名称</th>
                      <th>累计维护费用</th>
                      <th>年维护成本</th>
                      <th>维护次数</th>
                      <th>月均维护频率</th>
                      <th>平均寿命恢复</th>
                      <th>平均健康改善</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(data, idx) in schemesMaintenanceComparison.filter(c => c.maintenanceCount > 0)" :key="data.schemeId">
                      <td :class="['scheme-name-cell']">
                        <span class="color-dot" :style="{ background: comparisonColors[idx % comparisonColors.length] }"></span>
                        {{ data.schemeName }}
                      </td>
                      <td class="cost">¥{{ data.totalMaintenanceCost.toLocaleString() }}</td>
                      <td class="cost">¥{{ data.totalCostPerYear.toLocaleString() }}/年</td>
                      <td>{{ data.maintenanceCount }} 次</td>
                      <td>{{ data.maintenanceFrequency }} 次/月</td>
                      <td class="success">+{{ formatHours(data.avgLifespanRestored) }}</td>
                      <td class="success">+{{ data.avgHealthImprovement }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="comparison-table-card">
              <h4 class="section-heading">⚖️ 综合效益对比</h4>
              <div class="comparison-table-wrapper">
                <table class="comparison-table">
                  <thead>
                    <tr>
                      <th>方案名称</th>
                      <th>整体健康度</th>
                      <th>阀片寿命</th>
                      <th>密封件寿命</th>
                      <th>活塞寿命</th>
                      <th>年维护成本</th>
                      <th>成本效益比</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(data, idx) in schemesMaintenanceComparison.filter(c => c.maintenanceCount > 0)" :key="data.schemeId">
                      <td :class="['scheme-name-cell']">
                        <span class="color-dot" :style="{ background: comparisonColors[idx % comparisonColors.length] }"></span>
                        {{ data.schemeName }}
                      </td>
                      <td :class="getHealthTableClass(data.overallHealthScore)">
                        {{ data.overallHealthScore.toFixed(1) }}%
                      </td>
                      <td>{{ formatHours(data.valveLifespanHours) }}</td>
                      <td>{{ formatHours(data.sealLifespanHours) }}</td>
                      <td>{{ formatHours(data.pistonLifespanHours) }}</td>
                      <td class="cost">¥{{ data.totalCostPerYear.toLocaleString() }}</td>
                      <td>
                        {{ (data.overallHealthScore / Math.max(1, data.totalCostPerYear) * 1000).toFixed(2) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="table-note">💡 成本效益比 = 健康度 / 年维护成本 × 1000，数值越高表示投入产出比越好</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeSubtab === 'records'" class="maintenance-records-view">
      <div class="records-header">
        <h4 class="section-heading">
          <span>📋 维护记录管理</span>
          <span class="record-count-badge">{{ maintenanceRecords.length }}</span>
        </h4>
        <button @click="openAddRecordModal" class="add-record-btn">
          ➕ 登记维护记录
        </button>
      </div>

      <div v-if="maintenanceRecords.length === 0" class="empty-records">
        <div class="empty-icon">📝</div>
        <p>暂无维护记录</p>
        <p class="empty-tip">点击上方按钮登记首次维护记录</p>
      </div>

      <div v-else class="records-list">
        <div
          v-for="record in maintenanceRecords"
          :key="record.id"
          class="record-card"
        >
          <div class="record-header">
            <span :class="['record-type-badge', record.maintenanceType]">
              {{ MAINTENANCE_TYPE_LABELS[record.maintenanceType] }}
            </span>
            <span class="record-component">
              {{ COMPONENT_NAMES[record.component] }}
            </span>
            <span class="record-date">
              {{ formatDate(record.maintenanceDate) }}
            </span>
          </div>
          <div class="record-body">
            <p class="record-description">{{ record.description }}</p>
            <div class="record-stats">
              <div class="record-stat">
                <span class="stat-label">费用</span>
                <span class="stat-value cost">¥{{ record.cost.toFixed(0) }}</span>
              </div>
              <div class="record-stat">
                <span class="stat-label">操作人员</span>
                <span class="stat-value">{{ record.operator }}</span>
              </div>
              <div class="record-stat">
                <span class="stat-label">寿命恢复</span>
                <span class="stat-value success">+{{ formatHours(record.lifespanRestored) }}</span>
              </div>
              <div class="record-stat">
                <span class="stat-label">健康度变化</span>
                <span class="stat-value">
                  <span :class="record.healthScoreAfter > record.healthScoreBefore ? 'success' : 'danger'">
                    {{ record.healthScoreBefore }}% → {{ record.healthScoreAfter }}%
                  </span>
                </span>
              </div>
            </div>
            <p v-if="record.remarks" class="record-remarks">
              <strong>备注：</strong>{{ record.remarks }}
            </p>
          </div>
          <div class="record-actions">
            <button @click="editRecord(record)" class="record-action-btn edit">编辑</button>
            <button @click="deleteRecord(record.id)" class="record-action-btn delete">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeSubtab === 'calendar'" class="maintenance-calendar-view">
      <div class="calendar-header">
        <h4 class="section-heading">📅 维护日历</h4>
        <div class="calendar-view-toggle">
          <button
            @click="calendarView = 'month'"
            :class="['view-toggle-btn', { active: calendarView === 'month' }]"
          >
            月视图
          </button>
          <button
            @click="calendarView = 'list'"
            :class="['view-toggle-btn', { active: calendarView === 'list' }]"
          >
            列表视图
          </button>
        </div>
      </div>

      <div v-show="calendarView === 'month'" class="calendar-month-view">
        <div class="calendar-nav">
          <button @click="changeMonth(-1)" class="nav-btn">◀</button>
          <span class="calendar-title">
            {{ calendarCurrentDate.getFullYear() }}年{{ calendarCurrentDate.getMonth() + 1 }}月
          </span>
          <button @click="changeMonth(1)" class="nav-btn">▶</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-weekday">日</div>
          <div class="calendar-weekday">一</div>
          <div class="calendar-weekday">二</div>
          <div class="calendar-weekday">三</div>
          <div class="calendar-weekday">四</div>
          <div class="calendar-weekday">五</div>
          <div class="calendar-weekday">六</div>
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            :class="['calendar-day', { 
              'other-month': day.isOtherMonth,
              'today': day.isToday,
              'has-events': day.events.length > 0
            }]"
          >
            <span class="day-number">{{ day.date.getDate() }}</span>
            <div class="day-events">
              <div
                v-for="event in day.events.slice(0, 2)"
                :key="event.id"
                :class="['day-event', event.type, `priority-${event.priority}`]"
                :title="event.title"
              >
                {{ event.title.slice(0, 6) }}
              </div>
              <div v-if="day.events.length > 2" class="more-events">
                +{{ day.events.length - 2 }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="calendarView === 'list'" class="calendar-list-view">
        <div v-if="calendarEvents.length === 0" class="empty-calendar">
          <div class="empty-icon">📅</div>
          <p>暂无日历事件</p>
        </div>
        <div v-else class="event-list">
          <div
            v-for="event in calendarEvents"
            :key="event.id"
            :class="['event-item', event.type, `priority-${event.priority}`, { completed: event.isCompleted }]"
          >
            <div class="event-icon">
              {{ getEventIcon(event.type) }}
            </div>
            <div class="event-content">
              <div class="event-header">
                <span class="event-title">{{ event.title }}</span>
                <span :class="['event-priority', event.priority]">
                  {{ getPriorityLabel(event.priority) }}
                </span>
              </div>
              <p class="event-description">{{ event.description }}</p>
              <div class="event-meta">
                <span class="event-date">📅 {{ formatDateTime(event.date) }}</span>
                <span v-if="event.componentName" class="event-component">
                  🔧 {{ event.componentName }}
                </span>
                <span v-if="event.isCompleted" class="event-status completed">✅ 已完成</span>
                <span v-else class="event-status pending">⏳ 待处理</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeSubtab === 'analysis'" class="maintenance-analysis-view">
      <div class="analysis-stats-grid">
        <div class="analysis-stat-card">
          <span class="stat-icon">💰</span>
          <div class="stat-content">
            <span class="stat-label">累计维护费用</span>
            <span class="stat-number">¥{{ maintenanceCostStats.totalMaintenanceCost.toLocaleString() }}</span>
          </div>
        </div>
        <div class="analysis-stat-card">
          <span class="stat-icon">📊</span>
          <div class="stat-content">
            <span class="stat-label">月均维护费用</span>
            <span class="stat-number">¥{{ maintenanceCostStats.avgMonthlyCost.toFixed(0) }}</span>
          </div>
        </div>
        <div class="analysis-stat-card">
          <span class="stat-icon">🔧</span>
          <div class="stat-content">
            <span class="stat-label">维护总次数</span>
            <span class="stat-number">{{ maintenanceRecords.length }}</span>
          </div>
        </div>
        <div class="analysis-stat-card">
          <span class="stat-icon">⚡</span>
          <div class="stat-content">
            <span class="stat-label">月均维护频率</span>
            <span class="stat-number">{{ maintenanceCycleAnalysis.avgMaintenanceFrequency }} 次/月</span>
          </div>
        </div>
      </div>

      <div class="chart-item full-width">
        <div ref="costTrendChartRef" class="chart tall"></div>
        <p class="chart-label">维护成本趋势图（月度）</p>
      </div>

      <div class="chart-item full-width">
        <div ref="componentReplacementChartRef" class="chart tall"></div>
        <p class="chart-label">部件更换历史统计</p>
      </div>

      <div class="chart-item full-width">
        <div ref="cycleDeviationChartRef" class="chart tall"></div>
        <p class="chart-label">维护周期偏差分析</p>
      </div>

      <div v-if="maintenanceCycleAnalysis.componentReplacements.length > 0" class="replacement-summary">
        <h4 class="section-heading">📋 部件更换明细</h4>
        <div class="replacement-table-wrapper">
          <table class="replacement-table">
            <thead>
              <tr>
                <th>部件名称</th>
                <th>更换次数</th>
                <th>累计费用</th>
                <th>单次平均</th>
                <th>平均更换周期</th>
                <th>首次更换</th>
                <th>最近更换</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in maintenanceCycleAnalysis.componentReplacements" :key="item.component">
                <td><strong>{{ item.componentName }}</strong></td>
                <td>{{ item.replacementCount }} 次</td>
                <td class="cost">¥{{ item.totalCost.toLocaleString() }}</td>
                <td class="cost">¥{{ item.avgCost.toFixed(0) }}</td>
                <td>{{ formatHours(item.avgIntervalHours) }}</td>
                <td>{{ formatDate(item.firstReplacementDate) }}</td>
                <td>{{ formatDate(item.lastReplacementDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showAddRecordModal" class="modal-overlay" @click.self="closeAddRecordModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingRecord ? '编辑维护记录' : '登记维护记录' }}</h3>
          <button @click="closeAddRecordModal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>维护类型</label>
            <select v-model="newRecord.maintenanceType" class="form-select">
              <option value="inspection">例行检查</option>
              <option value="valve_replacement">更换阀片</option>
              <option value="seal_replacement">更换密封件</option>
              <option value="piston_replacement">更换活塞组件</option>
              <option value="other">其他维护</option>
            </select>
          </div>
          <div class="form-group">
            <label>维护部件</label>
            <select v-model="newRecord.component" class="form-select">
              <option value="system">系统整体</option>
              <option value="valve">阀片组件</option>
              <option value="seal">密封件</option>
              <option value="piston">活塞组件</option>
            </select>
          </div>
          <div class="form-group">
            <label>维护日期</label>
            <input
              type="datetime-local"
              v-model="dateTimeLocalValue"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>维护内容描述</label>
            <textarea
              v-model="newRecord.description"
              class="form-textarea"
              rows="3"
              placeholder="请描述维护的具体内容..."
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>维护费用 (元)</label>
              <input
                type="number"
                v-model.number="newRecord.cost"
                class="form-input"
                min="0"
                step="1"
              />
            </div>
            <div class="form-group">
              <label>操作人员</label>
              <input
                type="text"
                v-model="newRecord.operator"
                class="form-input"
                placeholder="请输入操作人员姓名"
              />
            </div>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea
              v-model="newRecord.remarks"
              class="form-textarea"
              rows="2"
              placeholder="其他需要记录的信息..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeAddRecordModal" class="btn btn-secondary">取消</button>
          <button @click="saveRecord" class="btn btn-primary">
            {{ editingRecord ? '保存修改' : '确认登记' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useBellowsStore } from '@/stores/bellows'
import type { Scheme } from '@/types'

const store = useBellowsStore()

const lifespanEvaluation = computed(() => store.lifespanEvaluation)
const selectedSchemes = computed(() => store.selectedSchemes)
const comparisonColors = ['#4a90d9', '#e67e22', '#27ae60', '#8e44ad', '#d35400']

const lifespanSubtabs = [
  { key: 'overview', label: '总览', icon: '📊' },
  { key: 'trend', label: '寿命趋势', icon: '📈' },
  { key: 'alerts', label: '维护预警', icon: '⚠️' },
  { key: 'records', label: '维护记录', icon: '📋' },
  { key: 'calendar', label: '维护日历', icon: '📅' },
  { key: 'analysis', label: '维护分析', icon: '📉' },
  { key: 'comparison', label: '方案对比', icon: '🆚' }
]
const activeSubtab = ref('overview')

const showAddRecordModal = ref(false)
const editingRecord = ref<any>(null)
const newRecord = ref({
  maintenanceType: 'inspection' as any,
  component: 'system' as any,
  maintenanceDate: Date.now(),
  description: '',
  cost: 0,
  operator: '',
  remarks: ''
})

const healthGaugeRef = ref<HTMLDivElement | null>(null)
const lifespanTrendChartRef = ref<HTMLDivElement | null>(null)
const componentLifespanBarRef = ref<HTMLDivElement | null>(null)
const compareHealthRadarRef = ref<HTMLDivElement | null>(null)
const compareLifespanBarRef = ref<HTMLDivElement | null>(null)
const costTrendChartRef = ref<HTMLDivElement | null>(null)
const componentReplacementChartRef = ref<HTMLDivElement | null>(null)
const cycleDeviationChartRef = ref<HTMLDivElement | null>(null)
const maintenanceCompareChartRef = ref<HTMLDivElement | null>(null)

let healthGaugeChart: echarts.ECharts | null = null
let lifespanTrendChart: echarts.ECharts | null = null
let componentLifespanBarChart: echarts.ECharts | null = null
let compareHealthRadarChart: echarts.ECharts | null = null
let compareLifespanBarChart: echarts.ECharts | null = null
let costTrendChart: echarts.ECharts | null = null
let componentReplacementChart: echarts.ECharts | null = null
let cycleDeviationChart: echarts.ECharts | null = null
let maintenanceCompareChart: echarts.ECharts | null = null

const maintenanceRecords = computed(() => store.sortedMaintenanceRecords)
const maintenanceCostStats = computed(() => store.maintenanceCostStats)
const maintenanceCycleAnalysis = computed(() => store.maintenanceCycleAnalysis)
const calendarEvents = computed(() => store.calendarEvents)
const schemesMaintenanceComparison = computed(() => store.schemesMaintenanceComparison)
const MAINTENANCE_TYPE_LABELS = computed(() => store.MAINTENANCE_TYPE_LABELS)
const COMPONENT_NAMES = computed(() => store.COMPONENT_NAMES)

const calendarCurrentDate = ref(new Date())
const calendarView = ref<'month' | 'list'>('month')

const comparisonSubtabs = [
  { key: 'lifespan', label: '寿命对比' },
  { key: 'maintenance', label: '维护对比' }
]
const comparisonSubtab = ref('lifespan')

const computedForComparison = computed(() => {
  const computedSchemes: (Scheme & { lifespanEvaluation: NonNullable<Scheme['lifespanEvaluation']> })[] = []
  selectedSchemes.value.forEach(s => {
    store.ensureSchemeLifespan(s)
    computedSchemes.push(s as Scheme & { lifespanEvaluation: NonNullable<Scheme['lifespanEvaluation']> })
  })
  return computedSchemes
})

function formatHours(hours: number): string {
  if (hours < 24) return `${hours}h`
  if (hours < 24 * 30) return `${(hours / 24).toFixed(1)}天`
  if (hours < 24 * 365) return `${(hours / 24 / 30).toFixed(1)}月`
  return `${(hours / 24 / 365).toFixed(2)}年`
}

function getHealthClass(score: number): string {
  if (score >= 70) return 'health-excellent'
  if (score >= 40) return 'health-warning'
  return 'health-danger'
}

function getHealthLabel(score: number): string {
  if (score >= 85) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 50) return '一般'
  if (score >= 30) return '较差'
  return '危险'
}

function getHealthBarClass(score: number): string {
  if (score >= 70) return 'fill-green'
  if (score >= 40) return 'fill-yellow'
  return 'fill-red'
}

function getHealthTableClass(score: number): string {
  if (score >= 70) return 'cell-success'
  if (score >= 40) return 'cell-warning'
  return 'cell-danger'
}

function getRiskLabel(level: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    warning: '预警',
    danger: '危险'
  }
  return map[level] || level
}

function getComponentIcon(key: string): string {
  const map: Record<string, string> = {
    valve: '🔩',
    seal: '🛡️',
    piston: '⚙️'
  }
  return map[key] || '📦'
}

function getFactorClass(factor: number): string {
  if (factor >= 2.5) return 'factor-danger'
  if (factor >= 1.5) return 'factor-warning'
  return 'factor-normal'
}

function getAlertIcon(level: string): string {
  const map: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '🚨'
  }
  return map[level] || '📌'
}

function getAlertLevelLabel(level: string): string {
  const map: Record<string, string> = {
    info: '提示',
    warning: '警告',
    danger: '紧急'
  }
  return map[level] || level
}

function getUrgencyLabel(urgency: string): string {
  const map: Record<string, string> = {
    low: '低优先级',
    medium: '中优先级',
    high: '高优先级',
    critical: '紧急'
  }
  return map[urgency] || urgency
}

function initHealthGauge() {
  if (!healthGaugeRef.value) return
  healthGaugeChart = echarts.init(healthGaugeRef.value)
  updateHealthGauge()
}

function updateHealthGauge() {
  if (!healthGaugeChart) return
  const score = lifespanEvaluation.value.overallHealthScore

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      splitNumber: 10,
      radius: '90%',
      center: ['50%', '58%'],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#e74c3c' },
          { offset: 0.4, color: '#f39c12' },
          { offset: 0.7, color: '#3498db' },
          { offset: 1, color: '#27ae60' }
        ])
      },
      progress: { show: true, width: 20 },
      pointer: { icon: 'triangle', length: '60%', width: 10, itemStyle: { color: '#333' } },
      axisLine: { lineStyle: { width: 20 } },
      axisTick: { distance: -28, length: 6, lineStyle: { color: '#999', width: 1 } },
      splitLine: { distance: -32, length: 12, lineStyle: { color: '#777', width: 2 } },
      axisLabel: { distance: 20, color: '#888', fontSize: 10 },
      anchor: { show: true, showAbove: true, size: 16, itemStyle: { borderWidth: 4, color: '#fff', borderColor: '#4a90d9' } },
      title: { offsetCenter: [0, '15%'], fontSize: 12, fontWeight: 600 },
      detail: {
        offsetCenter: [0, '45%'],
        valueAnimation: true,
        fontSize: 36,
        fontWeight: 700,
        formatter: '{value}%',
        color: '#2c3e50'
      },
      data: [{ value: Number(score.toFixed(1)), name: '健康度评分' }]
    }]
  }
  healthGaugeChart.setOption(option)
}

function initLifespanTrendChart() {
  if (!lifespanTrendChartRef.value) return
  lifespanTrendChart = echarts.init(lifespanTrendChartRef.value)
  updateLifespanTrendChart()
}

function updateLifespanTrendChart() {
  if (!lifespanTrendChart) return
  const trendData = lifespanEvaluation.value.trendData

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `运行时长: ${params[0]?.value[0]}h<br/>`
        params.forEach((p: any) => {
          html += `${p.seriesName}: ${p.value[1]}%<br/>`
        })
        return html
      }
    },
    legend: {
      data: ['阀片健康度', '密封件健康度', '活塞健康度', '整体健康度'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 25, top: 35, bottom: 40 },
    xAxis: {
      type: 'value',
      name: '运行时长 (小时)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: {
        fontSize: 9,
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
          return String(val)
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '健康度 (%)',
      min: 0,
      max: 100,
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 9 }
    },
    visualMap: {
      show: false,
      pieces: [
        { gt: 70, color: '#27ae60' },
        { gt: 40, lte: 70, color: '#f39c12' },
        { lte: 40, color: '#e74c3c' }
      ]
    },
    series: [
      {
        name: '阀片健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.valveHealth]),
        smooth: true,
        lineStyle: { color: '#e74c3c', width: 2 },
        itemStyle: { color: '#e74c3c' },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(231, 76, 60, 0.12)' },
            { offset: 1, color: 'rgba(231, 76, 60, 0.01)' }
          ])
        }
      },
      {
        name: '密封件健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.sealHealth]),
        smooth: true,
        lineStyle: { color: '#f39c12', width: 2 },
        itemStyle: { color: '#f39c12' },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(243, 156, 18, 0.12)' },
            { offset: 1, color: 'rgba(243, 156, 18, 0.01)' }
          ])
        }
      },
      {
        name: '活塞健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.pistonHealth]),
        smooth: true,
        lineStyle: { color: '#3498db', width: 2 },
        itemStyle: { color: '#3498db' },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(52, 152, 219, 0.12)' },
            { offset: 1, color: 'rgba(52, 152, 219, 0.01)' }
          ])
        }
      },
      {
        name: '整体健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.overallHealth]),
        smooth: true,
        lineStyle: { color: '#27ae60', width: 3, type: 'dashed' },
        itemStyle: { color: '#27ae60' },
        showSymbol: false,
        markLine: {
          silent: true,
          data: [
            { yAxis: 70, lineStyle: { color: '#27ae60', type: 'dashed' }, label: { formatter: '良好线 70%', fontSize: 9 } },
            { yAxis: 30, lineStyle: { color: '#e74c3c', type: 'dashed' }, label: { formatter: '危险线 30%', fontSize: 9 } }
          ]
        }
      }
    ]
  }

  lifespanTrendChart.setOption(option, true)
}

function initComponentLifespanBar() {
  if (!componentLifespanBarRef.value) return
  componentLifespanBarChart = echarts.init(componentLifespanBarRef.value)
  updateComponentLifespanBar()
}

function updateComponentLifespanBar() {
  if (!componentLifespanBarChart) return
  const comps = lifespanEvaluation.value.components

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let html = ''
        params.forEach((p: any) => {
          html += `${p.seriesName}: ${p.value.toLocaleString()} h<br/>`
        })
        return html
      }
    },
    legend: {
      data: ['剩余寿命', '基准寿命'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 60, right: 25, top: 35, bottom: 35 },
    xAxis: {
      type: 'category',
      data: comps.map(c => c.componentName),
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: '寿命 (小时)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: {
        fontSize: 9,
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
          return String(val)
        }
      }
    },
    series: [
      {
        name: '剩余寿命',
        type: 'bar',
        data: comps.map(c => ({
          value: c.remainingLifespanHours,
          itemStyle: {
            color: c.riskLevel === 'danger' ? '#e74c3c' : c.riskLevel === 'warning' ? '#f39c12' : '#27ae60'
          }
        })),
        barWidth: 25,
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => formatHours(p.value),
          fontSize: 10,
          fontWeight: 600
        }
      },
      {
        name: '基准寿命',
        type: 'bar',
        data: comps.map(c => ({
          value: c.baseLifespanHours,
          itemStyle: { color: '#bdc3c7' }
        })),
        barWidth: 25,
        barGap: '20%',
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => formatHours(p.value),
          fontSize: 9,
          color: '#999'
        }
      }
    ]
  }

  componentLifespanBarChart.setOption(option, true)
}

const dateTimeLocalValue = computed({
    get: () => {
      const d = new Date(newRecord.value.maintenanceDate)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    },
    set: (val: string) => {
      newRecord.value.maintenanceDate = new Date(val).getTime()
    }
  })

const calendarDays = computed(() => {
  const year = calendarCurrentDate.value.getFullYear()
  const month = calendarCurrentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  
  const days: Array<{
    date: Date
    isOtherMonth: boolean
    isToday: boolean
    events: any[]
  }> = []
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < startDayOfWeek; i++) {
    const d = new Date(year, month, -startDayOfWeek + i + 1)
    days.push({
      date: d,
      isOtherMonth: true,
      isToday: false,
      events: getEventsForDate(d)
    })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    const dStart = new Date(d)
    dStart.setHours(0, 0, 0, 0)
    const dEnd = new Date(d)
    dEnd.setHours(23, 59, 59, 999)
    const isToday = dStart.getTime() === today.getTime()
    
    days.push({
      date: d,
      isOtherMonth: false,
      isToday,
      events: getEventsForDate(d)
    })
  }
  
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const d = new Date(year, month + 1, i)
    days.push({
      date: d,
      isOtherMonth: true,
      isToday: false,
      events: getEventsForDate(d)
    })
  }
  
  return days
})

function getEventsForDate(date: Date): any[] {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  return calendarEvents.value.filter(e => 
    e.date >= startOfDay.getTime() && e.date <= endOfDay.getTime()
  )
}

function changeMonth(delta: number) {
  const newDate = new Date(calendarCurrentDate.value)
  newDate.setMonth(newDate.getMonth() + delta)
  calendarCurrentDate.value = newDate
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getEventIcon(type: string): string {
  const map: Record<string, string> = {
    maintenance: '✅',
    scheduled: '📅',
    alert: '🚨'
  }
  return map[type] || '📌'
}

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  }
  return map[priority] || priority
}

function openAddRecordModal() {
  editingRecord.value = null
  newRecord.value = {
    maintenanceType: 'inspection',
    component: 'system',
    maintenanceDate: Date.now(),
    description: '',
    cost: 0,
    operator: '',
    remarks: ''
  }
  showAddRecordModal.value = true
}

function closeAddRecordModal() {
  showAddRecordModal.value = false
  editingRecord.value = null
}

function editRecord(record: any) {
  editingRecord.value = record
  newRecord.value = {
    maintenanceType: record.maintenanceType,
    component: record.component,
    maintenanceDate: record.maintenanceDate,
    description: record.description,
    cost: record.cost,
    operator: record.operator,
    remarks: record.remarks
  }
  showAddRecordModal.value = true
}

function saveRecord() {
  if (!newRecord.value.description.trim()) {
    alert('请输入维护内容描述')
    return
  }
  
  if (editingRecord.value) {
    store.updateMaintenanceRecord(editingRecord.value.id, {
      maintenanceType: newRecord.value.maintenanceType,
      component: newRecord.value.component,
      maintenanceDate: newRecord.value.maintenanceDate,
      description: newRecord.value.description,
      cost: newRecord.value.cost,
      operator: newRecord.value.operator,
      remarks: newRecord.value.remarks
    })
  } else {
    store.addMaintenanceRecord(
      newRecord.value.maintenanceType,
      newRecord.value.component,
      newRecord.value.maintenanceDate,
      newRecord.value.description,
      newRecord.value.cost,
      newRecord.value.operator,
      newRecord.value.remarks
    )
  }
  
  closeAddRecordModal()
}

function deleteRecord(id: string) {
  if (confirm('确定要删除这条维护记录吗？删除后相关寿命数据将重新计算。')) {
    store.deleteMaintenanceRecord(id)
  }
}

function initCostTrendChart() {
  if (!costTrendChartRef.value) return
  costTrendChart = echarts.init(costTrendChartRef.value)
  updateCostTrendChart()
}

function updateCostTrendChart() {
  if (!costTrendChart) return
  const trendData = maintenanceCostStats.value.costTrend
  
  if (trendData.length === 0) {
    costTrendChart.setOption({
      backgroundColor: 'transparent',
      title: {
        text: '暂无维护成本数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 }
      }
    })
    return
  }
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `${params[0].axisValue}<br/>`
        params.forEach((p: any) => {
          html += `${p.seriesName}: ¥${p.value.toLocaleString()}<br/>`
        })
        return html
      }
    },
    legend: {
      data: ['总费用', '检查费用', '阀片更换', '密封更换', '活塞更换'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 25, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: trendData.map(d => d.date),
      axisLabel: { fontSize: 9, rotate: 30 }
    },
    yAxis: {
      type: 'value',
      name: '费用 (元)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 9 }
    },
    series: [
      {
        name: '总费用',
        type: 'line',
        data: trendData.map(d => d.totalCost),
        smooth: true,
        lineStyle: { color: '#2c3e50', width: 3 },
        itemStyle: { color: '#2c3e50' },
        showSymbol: true,
        symbolSize: 8
      },
      {
        name: '检查费用',
        type: 'bar',
        data: trendData.map(d => d.inspectionCost),
        itemStyle: { color: '#3498db' },
        stack: 'cost'
      },
      {
        name: '阀片更换',
        type: 'bar',
        data: trendData.map(d => d.valveCost),
        itemStyle: { color: '#e74c3c' },
        stack: 'cost'
      },
      {
        name: '密封更换',
        type: 'bar',
        data: trendData.map(d => d.sealCost),
        itemStyle: { color: '#f39c12' },
        stack: 'cost'
      },
      {
        name: '活塞更换',
        type: 'bar',
        data: trendData.map(d => d.pistonCost),
        itemStyle: { color: '#27ae60' },
        stack: 'cost'
      }
    ]
  }
  
  costTrendChart.setOption(option, true)
}

function initComponentReplacementChart() {
  if (!componentReplacementChartRef.value) return
  componentReplacementChart = echarts.init(componentReplacementChartRef.value)
  updateComponentReplacementChart()
}

function updateComponentReplacementChart() {
  if (!componentReplacementChart) return
  const replacements = maintenanceCycleAnalysis.value.componentReplacements
  
  if (replacements.length === 0) {
    componentReplacementChart.setOption({
      backgroundColor: 'transparent',
      title: {
        text: '暂无部件更换数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 }
      }
    })
    return
  }
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['更换次数', '累计费用', '单次平均费用'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 55, top: 40, bottom: 35 },
    xAxis: {
      type: 'category',
      data: replacements.map(r => r.componentName),
      axisLabel: { fontSize: 11 }
    },
    yAxis: [
      {
        type: 'value',
        name: '次数',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 9 }
      },
      {
        type: 'value',
        name: '费用 (元)',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 9 }
      }
    ],
    series: [
      {
        name: '更换次数',
        type: 'bar',
        data: replacements.map(r => r.replacementCount),
        itemStyle: { color: '#3498db' },
        barWidth: 25,
        yAxisIndex: 0
      },
      {
        name: '累计费用',
        type: 'bar',
        data: replacements.map(r => r.totalCost),
        itemStyle: { color: '#e74c3c' },
        barWidth: 25,
        yAxisIndex: 1
      },
      {
        name: '单次平均费用',
        type: 'line',
        data: replacements.map(r => r.avgCost),
        smooth: true,
        lineStyle: { color: '#27ae60', width: 2 },
        itemStyle: { color: '#27ae60' },
        symbol: 'circle',
        symbolSize: 10,
        yAxisIndex: 1
      }
    ]
  }
  
  componentReplacementChart.setOption(option, true)
}

function initCycleDeviationChart() {
  if (!cycleDeviationChartRef.value) return
  cycleDeviationChart = echarts.init(cycleDeviationChartRef.value)
  updateCycleDeviationChart()
}

function updateCycleDeviationChart() {
  if (!cycleDeviationChart) return
  const deviations = maintenanceCycleAnalysis.value.cycleDeviations
  
  if (deviations.length === 0) {
    cycleDeviationChart.setOption({
      backgroundColor: 'transparent',
      title: {
        text: '暂无周期偏差数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 }
      }
    })
    return
  }
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const dev = deviations[params[0].dataIndex]
        return `${dev.componentName}<br/>
          预期周期: ${dev.expectedCycleHours.toLocaleString()}h<br/>
          实际周期: ${dev.actualCycleHours.toLocaleString()}h<br/>
          偏差: ${dev.deviationHours > 0 ? '+' : ''}${dev.deviationHours.toLocaleString()}h (${dev.deviationPercent > 0 ? '+' : ''}${dev.deviationPercent}%)`
      }
    },
    legend: {
      data: ['预期周期', '实际周期', '偏差百分比'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 55, top: 40, bottom: 35 },
    xAxis: {
      type: 'category',
      data: deviations.map(d => d.componentName),
      axisLabel: { fontSize: 11 }
    },
    yAxis: [
      {
        type: 'value',
        name: '周期 (小时)',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { 
          fontSize: 9,
          formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)
        }
      },
      {
        type: 'value',
        name: '偏差 (%)',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 9, formatter: '{value}%' }
      }
    ],
    series: [
      {
        name: '预期周期',
        type: 'bar',
        data: deviations.map(d => d.expectedCycleHours),
        itemStyle: { color: '#95a5a6' },
        barWidth: 20,
        yAxisIndex: 0
      },
      {
        name: '实际周期',
        type: 'bar',
        data: deviations.map(d => d.actualCycleHours),
        itemStyle: { 
          color: (params: any) => {
            const dev = deviations[params.dataIndex]
            return dev.deviationPercent >= 0 ? '#27ae60' : '#e74c3c'
          }
        },
        barWidth: 20,
        yAxisIndex: 0
      },
      {
        name: '偏差百分比',
        type: 'line',
        data: deviations.map(d => d.deviationPercent),
        smooth: true,
        lineStyle: { 
          color: '#4a90d9' as any,
          width: 3
        },
        itemStyle: { 
          color: (params: any) => {
            return params.value >= 0 ? '#27ae60' : '#e74c3c'
          }
        },
        symbol: 'circle',
        symbolSize: 10,
        yAxisIndex: 1,
        markLine: {
          silent: true,
          data: [{ yAxis: 0, lineStyle: { color: '#7f8c8d', type: 'dashed' } }]
        }
      } as any
    ]
  }
  
  cycleDeviationChart.setOption(option, true)
}

function updateMaintenanceCompareChart() {
  if (!maintenanceCompareChart) return
  const comparisonData = schemesMaintenanceComparison.value
  if (comparisonData.length < 2) return
  
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['年维护成本', '平均寿命恢复', '健康度', '维护频率'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 55, top: 40, bottom: 35 },
    xAxis: {
      type: 'category',
      data: comparisonData.map(d => d.schemeName),
      axisLabel: { fontSize: 10, rotate: 15 }
    },
    yAxis: [
      {
        type: 'value',
        name: '费用/寿命/健康度',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 9 }
      },
      {
        type: 'value',
        name: '维护频率(次/月)',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 9 }
      }
    ],
    series: [
      {
        name: '年维护成本',
        type: 'bar',
        data: comparisonData.map(d => d.totalCostPerYear),
        itemStyle: { color: '#e74c3c' },
        yAxisIndex: 0
      },
      {
        name: '平均寿命恢复',
        type: 'bar',
        data: comparisonData.map(d => d.avgLifespanRestored),
        itemStyle: { color: '#3498db' },
        yAxisIndex: 0
      },
      {
        name: '健康度',
        type: 'line',
        data: comparisonData.map(d => d.overallHealthScore),
        smooth: true,
        lineStyle: { color: '#27ae60', width: 2 },
        itemStyle: { color: '#27ae60' },
        yAxisIndex: 0
      },
      {
        name: '维护频率',
        type: 'line',
        data: comparisonData.map(d => d.maintenanceFrequency),
        smooth: true,
        lineStyle: { color: '#f39c12', width: 2, type: 'dashed' },
        itemStyle: { color: '#f39c12' },
        yAxisIndex: 1
      }
    ]
  }
  
  maintenanceCompareChart.setOption(option, true)
}

function updateMaintenanceCharts() {
  updateCostTrendChart()
  updateComponentReplacementChart()
  updateCycleDeviationChart()
  updateMaintenanceCompareChart()
}

function updateComparisonCharts() {
  const schemes = computedForComparison.value
  if (schemes.length < 2) return

  if (compareHealthRadarChart) {
    const radarIndicator = [
      { name: '整体健康度', max: 100 },
      { name: '阀片健康', max: 100 },
      { name: '密封健康', max: 100 },
      { name: '活塞健康', max: 100 },
      { name: '维护周期(归一化)', max: 100 }
    ]

    const maxCycle = Math.max(...schemes.map(s => s.lifespanEvaluation.estimatedMaintenanceCycleHours), 1)

    const radarSeries = schemes.map((scheme, idx) => {
      const ev = scheme.lifespanEvaluation
      return {
        name: scheme.name,
        value: [
          ev.overallHealthScore,
          ev.components[0].healthScore,
          ev.components[1].healthScore,
          ev.components[2].healthScore,
          Math.min(100, (ev.estimatedMaintenanceCycleHours / maxCycle) * 100)
        ],
        lineStyle: { color: comparisonColors[idx % comparisonColors.length], width: 2 },
        itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
        areaStyle: {
          color: comparisonColors[idx % comparisonColors.length],
          opacity: 0.15
        }
      }
    })

    const radarOption: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {},
      legend: {
        data: schemes.map(s => s.name),
        bottom: 0,
        textStyle: { fontSize: 11 }
      },
      radar: {
        indicator: radarIndicator,
        radius: '60%',
        center: ['50%', '48%'],
        axisName: { fontSize: 11, color: '#555' },
        splitArea: {
          areaStyle: {
            color: ['rgba(52, 152, 219, 0.02)', 'rgba(52, 152, 219, 0.05)']
          }
        }
      },
      series: [{
        type: 'radar',
        data: radarSeries
      }]
    }

    compareHealthRadarChart.setOption(radarOption, true)
  }

  if (compareLifespanBarChart) {
    const barOption: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: schemes.map(s => s.name),
        top: 0,
        textStyle: { fontSize: 11 }
      },
      grid: { left: 60, right: 25, top: 35, bottom: 35 },
      xAxis: {
        type: 'category',
        data: ['阀片组件', '密封件', '活塞组件', '维护周期'],
        axisLabel: { fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        name: '小时',
        nameTextStyle: { fontSize: 10 },
        axisLabel: {
          fontSize: 9,
          formatter: (val: number) => {
            if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
            return String(val)
          }
        }
      },
      series: schemes.map((scheme, idx) => ({
        name: scheme.name,
        type: 'bar',
        data: [
          scheme.lifespanEvaluation.components[0].remainingLifespanHours,
          scheme.lifespanEvaluation.components[1].remainingLifespanHours,
          scheme.lifespanEvaluation.components[2].remainingLifespanHours,
          scheme.lifespanEvaluation.estimatedMaintenanceCycleHours
        ],
        itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
        barWidth: 20
      }))
    }

    compareLifespanBarChart.setOption(barOption, true)
  }
}

watch(() => lifespanEvaluation.value, () => {
  setTimeout(() => {
    updateHealthGauge()
    updateLifespanTrendChart()
    updateComponentLifespanBar()
  }, 50)
}, { deep: true })

watch(() => store.lastMaintenanceTimestamp, () => {
  setTimeout(() => {
    updateMaintenanceCharts()
  }, 100)
})

watch(() => maintenanceRecords.value.length, () => {
  setTimeout(() => {
    updateMaintenanceCharts()
  }, 100)
}, { deep: true })

watch(selectedSchemes, () => {
  setTimeout(() => {
    updateComparisonCharts()
    updateMaintenanceCompareChart()
    handleResize()
  }, 80)
}, { deep: true })

watch(activeSubtab, (newVal) => {
  setTimeout(() => {
    handleResize()
    if (newVal === 'overview') updateHealthGauge()
    if (newVal === 'trend') {
      updateLifespanTrendChart()
      updateComponentLifespanBar()
    }
    if (newVal === 'analysis') {
      updateCostTrendChart()
      updateComponentReplacementChart()
      updateCycleDeviationChart()
    }
    if (newVal === 'comparison') {
      updateComparisonCharts()
      updateMaintenanceCompareChart()
    }
  }, 60)
})

function handleResize() {
  healthGaugeChart?.resize()
  lifespanTrendChart?.resize()
  componentLifespanBarChart?.resize()
  compareHealthRadarChart?.resize()
  compareLifespanBarChart?.resize()
  costTrendChart?.resize()
  componentReplacementChart?.resize()
  cycleDeviationChart?.resize()
  maintenanceCompareChart?.resize()
}

function initComparisonCharts() {
  if (compareHealthRadarRef.value) {
    compareHealthRadarChart = echarts.init(compareHealthRadarRef.value)
  }
  if (compareLifespanBarRef.value) {
    compareLifespanBarChart = echarts.init(compareLifespanBarRef.value)
  }
  if (maintenanceCompareChartRef.value) {
    maintenanceCompareChart = echarts.init(maintenanceCompareChartRef.value)
  }
}

onMounted(() => {
  initHealthGauge()
  initLifespanTrendChart()
  initComponentLifespanBar()
  initComparisonCharts()
  initCostTrendChart()
  initComponentReplacementChart()
  initCycleDeviationChart()
  setTimeout(() => {
    updateHealthGauge()
    updateLifespanTrendChart()
    updateComponentLifespanBar()
    updateComparisonCharts()
    updateMaintenanceCharts()
  }, 120)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  healthGaugeChart?.dispose()
  lifespanTrendChart?.dispose()
  componentLifespanBarChart?.dispose()
  compareHealthRadarChart?.dispose()
  compareLifespanBarChart?.dispose()
  costTrendChart?.dispose()
  componentReplacementChart?.dispose()
  cycleDeviationChart?.dispose()
  maintenanceCompareChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.lifespan-container {
  width: 100%;
}

.high-risk-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 10px;
  border: 2px solid;
}

.high-risk-banner.danger {
  background: linear-gradient(90deg, #fee, #fff5f5);
  border-color: #e74c3c;
  animation: pulse-danger 2s ease-in-out infinite;
}

.high-risk-banner.warning {
  background: linear-gradient(90deg, #fff8e1, #fffdf5);
  border-color: #f39c12;
  animation: pulse-warning 2.5s ease-in-out infinite;
}

@keyframes pulse-danger {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
}

@keyframes pulse-warning {
  0%, 100% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(243, 156, 18, 0); }
}

.high-risk-banner.warning .banner-text {
  color: #b7791f;
}

.banner-icon {
  font-size: 22px;
}

.banner-text {
  font-size: 14px;
  color: #c0392b;
  font-weight: 500;
  flex: 1;
}

.lifespan-subtabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.lifespan-subtab {
  padding: 8px 16px;
  border: 2px solid transparent;
  border-radius: 20px;
  background: white;
  color: #666;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.lifespan-subtab:hover {
  background: #e8f4f8;
  color: #2980b9;
}

.lifespan-subtab.active {
  background: linear-gradient(135deg, #4a90d9, #357abd);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
}

.lifespan-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.health-score-section {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 16px;
}

.overall-health-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.overall-health-card.health-excellent {
  border: 2px solid #27ae60;
}

.overall-health-card.health-warning {
  border: 2px solid #f39c12;
}

.overall-health-card.health-danger {
  border: 2px solid #e74c3c;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.health-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.health-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #ecf0f1;
  color: #666;
}

.health-excellent .health-badge {
  background: #e8f8f0;
  color: #27ae60;
}

.health-warning .health-badge {
  background: #fef3e2;
  color: #f39c12;
}

.health-danger .health-badge {
  background: #ffebee;
  color: #e74c3c;
}

.health-gauge {
  width: 100%;
  height: 180px;
}

.health-info-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: #999;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.info-value.success {
  color: #27ae60;
}

.info-value.danger {
  color: #e74c3c;
}

.component-health-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.component-health-card {
  background: white;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #27ae60;
}

.component-health-card.risk-warning {
  border-left-color: #f39c12;
  background: linear-gradient(90deg, #fffcf0, white);
}

.component-health-card.risk-danger {
  border-left-color: #e74c3c;
  background: linear-gradient(90deg, #fff5f5, white);
}

.comp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.comp-icon {
  font-size: 18px;
}

.comp-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.comp-risk-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.comp-risk-badge.normal {
  background: #e8f8f0;
  color: #27ae60;
}

.comp-risk-badge.warning {
  background: #fef3e2;
  color: #f39c12;
}

.comp-risk-badge.danger {
  background: #ffebee;
  color: #e74c3c;
}

.comp-health-bar {
  position: relative;
  height: 22px;
  background: #f0f0f0;
  border-radius: 11px;
  margin-bottom: 10px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  border-radius: 11px;
  transition: width 0.4s ease;
}

.health-fill.fill-green {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.health-fill.fill-yellow {
  background: linear-gradient(90deg, #f1c40f, #f39c12);
}

.health-fill.fill-red {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.health-percent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.comp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.comp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-label {
  font-size: 10px;
  color: #999;
}

.stat-value {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  font-family: 'SF Mono', Menlo, monospace;
}

.comp-warn-threshold {
  margin-top: 8px;
  text-align: center;
}

.threshold-warn {
  font-size: 10px;
  color: #e67e22;
  background: #fef9e7;
  padding: 3px 8px;
  border-radius: 10px;
}

.wear-factors-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-heading {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.factors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.factor-item {
  display: grid;
  grid-template-columns: 70px 1fr 60px;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.factor-name {
  font-size: 12px;
  color: #555;
  font-weight: 500;
}

.factor-bar {
  height: 10px;
  background: #ecf0f1;
  border-radius: 5px;
  overflow: hidden;
}

.factor-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
  background: #27ae60;
}

.factor-fill.factor-normal {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.factor-fill.factor-warning {
  background: linear-gradient(90deg, #f1c40f, #f39c12);
}

.factor-fill.factor-danger {
  background: linear-gradient(90deg, #e67e22, #e74c3c);
}

.factor-value {
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  font-family: 'SF Mono', Menlo, monospace;
  color: #333;
}

.lifespan-trend-view,
.lifespan-alerts-view,
.lifespan-comparison-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.chart-item.full-width {
  grid-column: 1 / -1;
}

.chart {
  width: 100%;
  height: 200px;
}

.chart.tall {
  height: 280px;
}

.chart-label {
  margin: 10px 0 0 0;
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.alerts-section,
.suggestions-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.alert-count-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #e74c3c;
  color: white;
}

.empty-alerts {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-alerts .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-alerts p {
  margin: 4px 0;
  font-size: 13px;
}

.empty-alerts .empty-tip {
  font-size: 11px;
  color: #bbb;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  border-radius: 10px;
  padding: 12px 14px;
  border-left: 4px solid;
}

.alert-item.info {
  background: #e8f4fd;
  border-color: #3498db;
}

.alert-item.warning {
  background: #fff8e1;
  border-color: #f39c12;
}

.alert-item.danger {
  background: #ffebee;
  border-color: #e74c3c;
  animation: alert-pulse 2s ease-in-out infinite;
}

@keyframes alert-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(231, 76, 60, 0); }
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.alert-icon {
  font-size: 16px;
}

.alert-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.alert-level-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.alert-item.info .alert-level-badge {
  background: rgba(52, 152, 219, 0.15);
  color: #2980b9;
}

.alert-item.warning .alert-level-badge {
  background: rgba(243, 156, 18, 0.15);
  color: #b7791f;
}

.alert-item.danger .alert-level-badge {
  background: rgba(231, 76, 60, 0.15);
  color: #c0392b;
}

.alert-message {
  margin: 0 0 10px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #555;
}

.alert-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 11px;
}

.alert-remaining,
.alert-action {
  color: #666;
}

.alert-remaining strong {
  color: #2c3e50;
  font-weight: 600;
}

.alert-item.danger .alert-action strong {
  color: #e74c3c;
}

.alert-item.warning .alert-action strong {
  color: #f39c12;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item {
  border-radius: 10px;
  padding: 12px 14px;
  background: #f8f9fa;
  border: 1px solid #e8ecef;
}

.suggestion-item.urgency-critical {
  background: #fff5f5;
  border-color: #f5c6c6;
}

.suggestion-item.urgency-high {
  background: #fffaf0;
  border-color: #fde3c4;
}

.suggestion-item.urgency-medium {
  background: #f5faff;
  border-color: #c5e1f9;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.urgency-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.urgency-badge.low {
  background: #e8f8f0;
  color: #27ae60;
}

.urgency-badge.medium {
  background: #e8f4fd;
  color: #3498db;
}

.urgency-badge.high {
  background: #fef3e2;
  color: #e67e22;
}

.urgency-badge.critical {
  background: #ffebee;
  color: #e74c3c;
  animation: urgency-blink 1.5s ease-in-out infinite;
}

@keyframes urgency-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.suggestion-component {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.suggestion-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.suggestion-label {
  flex-shrink: 0;
  color: #888;
  min-width: 70px;
}

.suggestion-value {
  color: #333;
  flex: 1;
}

.suggestion-value.action {
  font-weight: 600;
  color: #2980b9;
}

.suggestion-value.schedule {
  color: #27ae60;
  font-weight: 500;
}

.suggestion-value.cost {
  color: #e67e22;
  font-weight: 600;
  font-family: 'SF Mono', Menlo, monospace;
}

.suggestion-value.reason {
  color: #7f8c8d;
  font-size: 11px;
}

.reason-row {
  padding-top: 6px;
  border-top: 1px dashed #e0e0e0;
}

.empty-compare {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #999;
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e0e0e0;
}

.empty-compare-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-compare p {
  font-size: 13px;
  margin: 4px 0;
}

.empty-compare-tip {
  font-size: 11px !important;
  color: #bbb;
}

.comparison-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-table-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.comparison-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e8ecef;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.comparison-table th,
.comparison-table td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #555;
  font-size: 11px;
  white-space: nowrap;
}

.comparison-table tbody tr:hover {
  background: #f5faff;
}

.comparison-table tbody tr:last-child td {
  border-bottom: none;
}

.scheme-name-cell {
  text-align: left !important;
  font-weight: 600;
  color: #333;
}

.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.cell-success {
  color: #27ae60;
  font-weight: 600;
}

.cell-warning {
  color: #f39c12;
  font-weight: 600;
}

.cell-danger {
  color: #e74c3c;
  font-weight: 600;
}

.high-risk-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: #ffebee;
  color: #e74c3c;
  font-size: 10px;
  font-weight: 600;
}

.no-risk-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e8f8f0;
  color: #27ae60;
  font-size: 10px;
  font-weight: 600;
}

.warning-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: #fef3e2;
  color: #e67e22;
  font-size: 10px;
  font-weight: 600;
}

.compare-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
  background: #eaf4fd;
  border: 1px solid #b8dff7;
  border-radius: 8px;
}

.hint-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.hint-text {
  font-size: 12px;
  color: #2980b9;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .health-score-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .comp-stats {
    grid-template-columns: 1fr;
  }

  .health-info-row {
    grid-template-columns: 1fr;
  }

  .alert-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}

.comparison-subtabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.comparison-subtab {
  padding: 6px 14px;
  border: 1px solid #d0d7de;
  border-radius: 16px;
  background: white;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.comparison-subtab:hover {
  background: #f0f4f8;
  color: #2980b9;
}

.comparison-subtab.active {
  background: #e8f4f8;
  color: #2980b9;
  border-color: #4a90d9;
}

.empty-compare.small {
  min-height: 200px;
}

.table-note {
  margin: 10px 0 0 0;
  font-size: 11px;
  color: #888;
  text-align: right;
}

.maintenance-records-view,
.maintenance-calendar-view,
.maintenance-analysis-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.record-count-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #3498db;
  color: white;
  margin-left: 8px;
}

.add-record-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #27ae60, #219a52);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-record-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.empty-records {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e0e0e0;
}

.empty-records .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #3498db;
  transition: all 0.2s;
}

.record-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.record-card.valve_replacement {
  border-left-color: #e74c3c;
}

.record-card.seal_replacement {
  border-left-color: #f39c12;
}

.record-card.piston_replacement {
  border-left-color: #27ae60;
}

.record-card.inspection {
  border-left-color: #3498db;
}

.record-card.other {
  border-left-color: #95a5a6;
}

.record-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.record-type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #e8f4fd;
  color: #2980b9;
}

.record-type-badge.valve_replacement {
  background: #ffebee;
  color: #c0392b;
}

.record-type-badge.seal_replacement {
  background: #fef3e2;
  color: #b7791f;
}

.record-type-badge.piston_replacement {
  background: #e8f8f0;
  color: #1e8449;
}

.record-type-badge.inspection {
  background: #e8f4fd;
  color: #2980b9;
}

.record-type-badge.other {
  background: #f1f2f6;
  color: #7f8c8d;
}

.record-component {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.record-date {
  font-size: 11px;
  color: #999;
  margin-left: auto;
}

.record-body {
  margin-bottom: 12px;
}

.record-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}

.record-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.record-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.record-stat .stat-label {
  font-size: 10px;
  color: #999;
}

.record-stat .stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.record-stat .stat-value.cost {
  color: #e67e22;
  font-family: 'SF Mono', Menlo, monospace;
}

.record-stat .stat-value.success {
  color: #27ae60;
}

.record-remarks {
  margin: 10px 0 0 0;
  font-size: 12px;
  color: #7f8c8d;
  line-height: 1.5;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

.record-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.record-action-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.record-action-btn.edit {
  background: #e8f4fd;
  color: #2980b9;
}

.record-action-btn.edit:hover {
  background: #d4e9f0;
}

.record-action-btn.delete {
  background: #fde8e8;
  color: #c0392b;
}

.record-action-btn.delete:hover {
  background: #f8d0d0;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.calendar-view-toggle {
  display: flex;
  background: white;
  border-radius: 8px;
  padding: 2px;
}

.view-toggle-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.view-toggle-btn.active {
  background: #4a90d9;
  color: white;
}

.calendar-month-view {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.calendar-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.nav-btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f0f4f8;
  border-color: #4a90d9;
}

.calendar-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-weekday {
  background: #f8f9fa;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.calendar-day {
  background: white;
  padding: 8px;
  min-height: 70px;
  position: relative;
}

.calendar-day.other-month {
  background: #fafafa;
  color: #ccc;
}

.calendar-day.today {
  background: #e8f4fd;
}

.calendar-day.today .day-number {
  background: #4a90d9;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.calendar-day.has-events {
  background: #fff8e1;
}

.day-number {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.other-month .day-number {
  color: #ccc;
}

.day-events {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-event {
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.day-event.maintenance {
  background: #d5f5e3;
  color: #1e8449;
}

.day-event.scheduled {
  background: #d6eaf8;
  color: #2980b9;
}

.day-event.alert {
  background: #fadbd8;
  color: #c0392b;
}

.day-event.priority-critical {
  animation: pulse 1.5s ease-in-out infinite;
}

.more-events {
  font-size: 10px;
  color: #666;
  text-align: center;
}

.empty-calendar {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e0e0e0;
}

.empty-calendar .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  display: flex;
  gap: 12px;
  background: white;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #3498db;
  transition: all 0.2s;
}

.event-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.event-item.maintenance {
  border-left-color: #27ae60;
  background: linear-gradient(90deg, #e8f8f0, white);
}

.event-item.scheduled {
  border-left-color: #3498db;
  background: linear-gradient(90deg, #e8f4fd, white);
}

.event-item.alert {
  border-left-color: #e74c3c;
  background: linear-gradient(90deg, #ffebee, white);
}

.event-item.completed {
  opacity: 0.7;
}

.event-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.event-content {
  flex: 1;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
  gap: 8px;
}

.event-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.event-priority {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.event-priority.low {
  background: #e8f8f0;
  color: #27ae60;
}

.event-priority.medium {
  background: #e8f4fd;
  color: #3498db;
}

.event-priority.high {
  background: #fef3e2;
  color: #e67e22;
}

.event-priority.critical {
  background: #ffebee;
  color: #e74c3c;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.event-description {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.event-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #888;
}

.event-status.completed {
  color: #27ae60;
  font-weight: 500;
}

.event-status.pending {
  color: #e67e22;
  font-weight: 500;
}

.analysis-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.analysis-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #4a90d9;
}

.analysis-stat-card:nth-child(2) {
  border-left-color: #f39c12;
}

.analysis-stat-card:nth-child(3) {
  border-left-color: #27ae60;
}

.analysis-stat-card:nth-child(4) {
  border-left-color: #e74c3c;
}

.analysis-stat-card .stat-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.analysis-stat-card .stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.analysis-stat-card .stat-label {
  font-size: 12px;
  color: #888;
}

.analysis-stat-card .stat-number {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
  font-family: 'SF Mono', Menlo, monospace;
}

.replacement-summary {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.replacement-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e8ecef;
}

.replacement-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.replacement-table th,
.replacement-table td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
}

.replacement-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #555;
  font-size: 11px;
  white-space: nowrap;
}

.replacement-table tbody tr:hover {
  background: #f5faff;
}

.replacement-table tbody tr:last-child td {
  border-bottom: none;
}

.replacement-table .cost {
  color: #e67e22;
  font-weight: 600;
  font-family: 'SF Mono', Menlo, monospace;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4a90d9;
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: linear-gradient(135deg, #4a90d9, #357abd);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.3);
}

.comparison-table .cost {
  color: #e67e22;
  font-weight: 600;
  font-family: 'SF Mono', Menlo, monospace;
}

.comparison-table .success {
  color: #27ae60;
  font-weight: 600;
}
</style>
