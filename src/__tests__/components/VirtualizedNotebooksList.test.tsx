import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtualizedNotebooksList } from "@/components/notes/VirtualizedNotebooksList";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DndContext } from "@dnd-kit/core";
import { ReactNode } from "react";

// Mock useNotebooks hook
vi.mock("@/hooks/useNotebooks", () => ({
  useNotebooks: () => ({
    addNotebook: vi.fn(),
    updateNotebook: vi.fn(),
    deleteNotebook: vi.fn(),
    addTagToNotebook: vi.fn(),
    removeTagFromNotebook: vi.fn(),
    getAllTags: () => [],
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const Wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <DndContext>{children}</DndContext>
  </QueryClientProvider>
);

describe("VirtualizedNotebooksList", () => {
  const mockOnSelectNote = vi.fn();
  const mockOnAddNote = vi.fn();
  const mockOnDeleteNote = vi.fn();

  const defaultProps = {
    notebooks: [],
    notes: [],
    selectedNoteId: null,
    onSelectNote: mockOnSelectNote,
    onAddNote: mockOnAddNote,
    onDeleteNote: mockOnDeleteNote,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render empty state when no notebooks", () => {
    const { getByText } = render(
      <Wrapper>
        <VirtualizedNotebooksList {...defaultProps} />
      </Wrapper>
    );

    expect(getByText("Nenhum caderno")).toBeInTheDocument();
    expect(getByText("Criar primeiro caderno")).toBeInTheDocument();
  });

  it("should render header with Cadernos title", () => {
    const { getByText } = render(
      <Wrapper>
        <VirtualizedNotebooksList {...defaultProps} />
      </Wrapper>
    );

    expect(getByText("Cadernos")).toBeInTheDocument();
  });

  it("should render notebooks when provided", () => {
    const notebooks = [
      { id: "1", name: "Notebook 1", user_id: "user1", created_at: "", updated_at: "" },
      { id: "2", name: "Notebook 2", user_id: "user1", created_at: "", updated_at: "" },
    ];

    const { getByText } = render(
      <Wrapper>
        <VirtualizedNotebooksList {...defaultProps} notebooks={notebooks} />
      </Wrapper>
    );

    expect(getByText("Notebook 1")).toBeInTheDocument();
    expect(getByText("Notebook 2")).toBeInTheDocument();
  });

  it("should show note count for each notebook", () => {
    const notebooks = [
      { id: "1", name: "Notebook 1", user_id: "user1", created_at: "", updated_at: "" },
    ];
    const notes = [
      {
        id: "note1",
        notebook_id: "1",
        title: "Note 1",
        content: "",
        user_id: "user1",
        created_at: "",
        updated_at: "",
        is_pinned: false,
        color: null,
        linked_task_id: null,
      },
      {
        id: "note2",
        notebook_id: "1",
        title: "Note 2",
        content: "",
        user_id: "user1",
        created_at: "",
        updated_at: "",
        is_pinned: false,
        color: null,
        linked_task_id: null,
      },
    ];

    const { getByText } = render(
      <Wrapper>
        <VirtualizedNotebooksList {...defaultProps} notebooks={notebooks} notes={notes} />
      </Wrapper>
    );

    // Count badge showing 2 notes
    expect(getByText("2")).toBeInTheDocument();
  });

  it("should render sort select when onSortChange is provided", () => {
    const mockOnSortChange = vi.fn();

    const { getByRole } = render(
      <Wrapper>
        <VirtualizedNotebooksList
          {...defaultProps}
          sortBy="updated"
          onSortChange={mockOnSortChange}
        />
      </Wrapper>
    );

    // Sort button should be present (ArrowUpDown icon)
    const sortTrigger = getByRole("combobox");
    expect(sortTrigger).toBeInTheDocument();
  });

  it("should use normal rendering for small lists (<= 20 items)", () => {
    const notebooks = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      name: `Notebook ${i}`,
      user_id: "user1",
      created_at: "",
      updated_at: "",
    }));

    const { getByText } = render(
      <Wrapper>
        <VirtualizedNotebooksList {...defaultProps} notebooks={notebooks} />
      </Wrapper>
    );

    // All notebooks should be visible (not virtualized)
    notebooks.forEach((nb) => {
      expect(getByText(nb.name)).toBeInTheDocument();
    });
  });

  it("should call onSelectNotebook when notebook is clicked", async () => {
    const mockOnSelectNotebook = vi.fn();
    const notebooks = [
      { id: "1", name: "Notebook 1", user_id: "user1", created_at: "", updated_at: "" },
    ];

    const { getByText } = render(
      <Wrapper>
        <VirtualizedNotebooksList
          {...defaultProps}
          notebooks={notebooks}
          onSelectNotebook={mockOnSelectNotebook}
        />
      </Wrapper>
    );

    await userEvent.click(getByText("Notebook 1"));
    expect(mockOnSelectNotebook).toHaveBeenCalledWith("1");
  });

  it("should highlight selected notebook", () => {
    const notebooks = [
      { id: "1", name: "Notebook 1", user_id: "user1", created_at: "", updated_at: "" },
      { id: "2", name: "Notebook 2", user_id: "user1", created_at: "", updated_at: "" },
    ];

    const { getByText } = render(
      <Wrapper>
        <VirtualizedNotebooksList
          {...defaultProps}
          notebooks={notebooks}
          selectedNotebookId="1"
          onSelectNotebook={vi.fn()}
        />
      </Wrapper>
    );

    // The selected notebook should have the text-primary class
    const selectedText = getByText("Notebook 1");
    expect(selectedText).toHaveClass("text-primary");
  });
});
