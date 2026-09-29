import { Redirect } from 'expo-router';

// Clients no longer approve or reject content; old links (notifications) land on the Home tab.
export default function RetiredClientReview() {
  return <Redirect href="/client" />;
}
