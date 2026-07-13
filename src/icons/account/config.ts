import jenkinsIconUrl from './jenkins.png?url';
import jumpserverIconUrl from './jumpserver.png?url';
import gitlabIconUrl from './gitlab.png?url';
import defaultIconUrl from './default.svg?url';

export interface AccountIconOption {
  key: string;
  label: string;
  url: string;
}

export const ACCOUNT_ICON_OPTIONS: AccountIconOption[] = [
  { key: 'jenkins', label: 'Jenkins', url: jenkinsIconUrl },
  { key: 'jumpserver', label: 'JumpServer', url: jumpserverIconUrl },
  { key: 'gitlab', label: 'GitLab', url: gitlabIconUrl },
  { key: 'default', label: 'Default', url: defaultIconUrl },
];

export function getAccountIconUrl(iconKey: string): string {
  const opt = ACCOUNT_ICON_OPTIONS.find(o => o.key === iconKey);
  return opt?.url || '';
}
