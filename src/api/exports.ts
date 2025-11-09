import axios from "../lib/axios";

export const getZip = async (diagramId: string) => {
  const response = await axios.get(`export/generate-spring/${diagramId}`, {
    responseType: "blob",
  });
  return response.data;
};

export const getPostman = async (diagramId: string) => {
  const response = await axios.get(`export/generate-postman/${diagramId}`, {
    responseType: "blob",
  });
  return response.data;
};

export const getFlutter = async (diagramId: string) => {
  const response = await axios.get(`export/generate-flutter/${diagramId}`, {
    responseType: "blob",
  });
  return response.data;
}
