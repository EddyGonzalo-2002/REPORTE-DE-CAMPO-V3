import { useMapEvents } from 'react-leaflet';

export const MapEventsHandler = ({ isEditMode, onMapClick }) => {
  useMapEvents({
    click(e) {
      if (isEditMode && onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};
