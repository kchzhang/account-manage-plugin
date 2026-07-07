import { ref } from 'vue';

export type ViewName = 'list' | 'add' | 'edit' | 'import-export';

interface ViewParams {
  accountId?: string;
}

const currentView = ref<ViewName>('list');
const viewParams = ref<ViewParams>({});

export function useViewRouter() {
  function navigate(view: ViewName, params?: ViewParams) {
    currentView.value = view;
    viewParams.value = params ?? {};
  }

  function goBack() {
    currentView.value = 'list';
    viewParams.value = {};
  }

  return {
    currentView,
    viewParams,
    navigate,
    goBack,
  };
}
