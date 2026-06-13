import { createApp, h } from 'vue';
import { NConfigProvider, NMessageProvider, NDialogProvider, itIT, dateItIT } from 'naive-ui';
import Dashboard from './pages/Dashboard.vue';

const App = {
  render() {
    return h(NConfigProvider, { locale: itIT, dateLocale: dateItIT }, () =>
      h(NDialogProvider, null, () =>
        h(NMessageProvider, null, () => h(Dashboard))
      )
    );
  },
};

createApp(App).mount('#app');
