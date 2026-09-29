import { Redirect } from 'expo-router';

// Clients no longer approve or reject content; the old approval centre sends them Home.
export default function RetiredClientApprovals() {
  return <Redirect href="/client" />;
}
