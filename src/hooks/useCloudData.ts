/**
 * Re-export useCloudData from CloudDataContext for backwards compatibility.
 * The CloudDataContext is the central source of truth for all cloud-synchronized data.
 */
export { useCloudData, type UserActivity } from '@/context/CloudDataContext';