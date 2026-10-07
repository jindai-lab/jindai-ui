import { Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "../api";

// Authors input with autocomplete over the bibliography's existing authors.
//
// mode="tags" keeps free entry (users can always add a new author with
// Enter), while suggestions come from GET /bibliography/authors.  There may
// be thousands of distinct authors, so the backend filters a Redis-cached
// list server side and the frontend only asks for a bounded result per
// (debounced) keystroke.
export default function AuthorsSelect({ placeholder, ...props }) {
  const [options, setOptions] = useState([]);
  const timerRef = useRef(null);

  const fetchAuthors = (q = "") => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const resp = await apiClient.bibliographyAuthors(q, 100);
        if (resp?.success) {
          setOptions(resp.results.map((name) => ({ label: name, value: name })));
        }
      } catch {
        // autocomplete is best-effort; tags mode still accepts free input
      }
    }, 200);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <Select
      mode="tags"
      placeholder={placeholder}
      options={options}
      onSearch={fetchAuthors}
      onDropdownVisibleChange={(open) => {
        // Show the most common/first authors as soon as the dropdown opens.
        if (open) fetchAuthors("");
      }}
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      {...props}
    />
  );
}